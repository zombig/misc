if (!net) {
	var net = {};
}
if (!net.horde) {
	net.horde = {};
}
if (!net.horde.togglev6) {
	net.horde.togglev6 = {};
}

net.horde.togglev6.debug = false;
net.horde.togglev6.desiredSetting = null;
net.horde.togglev6.numPendingRequests = 0;
net.horde.togglev6.seenResponses = new Array();
net.horde.togglev6.uninstalling = false;
net.horde.togglev6.uuid = '{60bdc398-8c69-459c-80e3-d8c555f13cb9}';
net.horde.togglev6.waitUntilIdle = null;

/* browser instances' webProgress.isLoadingDocument is only set when the
 * page is loading and not for any subsequent in-page requests, such as via
 * XmlHttpRequest.  Since we don't want to interrupt these requests when
 * toggling IPv6, we need to track these requests some other way.
 *
 * A tab progress listener (gBrowser.addTabsProgressListener()) seems the
 * logical choice, but progress listeners only receive STATE_STOP events for
 * in-page requests, with no corresponding STATE_START.  This seems buggy.
 *
 * Specifically, progress listeners' onStateChange() receives:
 * - Page load start
 *   aFlag: 0xf0001 (STATE_IS_REQUEST, STATE_IS_DOCUMENT, STATE_IS_NETWORK,
 *     STATE_IS_WINDOW, STATE_START)
 * - Page load finish
 *   aFlag: 0xc0010 (STATE_IS_NETWORK, STATE_IS_WINDOW, STATE_STOP)
 *   aStatus: 0 when the page was successfully pulled from the network (i.e.,
 *            the request wasn't cached)
 *            0x805d0021 when the page was cached
 *
 *   If a page load is canceled (network connection interrupted, user
 *   presses the browser Stop button, etc.), aStatus is nonzero and
 *   seems to correspond with a GTK_MOZ_EMBED_STATUS_* value.  For example,
 *   2152398850 (0x804b0002) is GTK_MOZ_EMBED_STATUS_FAILED_USERCANCELED.
 *
 *   For failed requests, the progress listener receives an additional event:
 *     aFlag: 0x10010 (STATE_IS_REQUEST, STATE_STOP)
 *     aStatus: 0
 * - Progress events are also generated when new tabs are opened:
 *   aFlag: 0xc0010 (STATE_IS_NETWORK, STATE_IS_WINDOW, STATE_STOP)
 *   aStatus: 0
 * - In-page start
 *   Nothing.
 * - In-page finish: success
 *   aFlag: 0x10010 (STATE_IS_REQUEST, STATE_STOP)
 *   aStatus: 0
 *
 *   For failed requests (I used XmlHttpRequest() to fetch a URL from
 *   a server that was refusing connections), the progress listener
 *   receives no events.
 *
 * Ok, so progress listeners aren't viable. The observer interface seems
 * like the next logical choice. Unfortunately, http-on-examine-response
 * never receives events for requests that have no response (page load
 * interrupted with the Stop button, server refused connection, etc.).
 *
 * However, progress listeners *do* receive events for these failed page
 * loads. So, in:
 * - http-on-modify-request
 *   Increment numPendingResponses.
 * - http-on-examine-response, http-on-examine-cached-response
 *   - Decrement numPendingResponses, but only if numPendingResponses
 *     isn't negative. Adding our observers probably races browser
 *     startup, so the browser can start loading some pages that our
 *     http-on-modify-request observer doesn't see.
 *   - Store the response in seenResponses, so our progress listener
 *     can tell whether we've already seen a response (and therefore
 *     decremented numPendingResponses already).
 * - StatusListener
 *   - If the observer has already seen this request (it's in
 *     seenResponses), remove the response from seenResponses so we
 *     don't "leak" memory, then return.
 *   - If the response hasn't been seen by the observer, it's safe
 *     to decrement numPendingResponses.
 *   - If numPendingResponses is 0, we can safely purge seenResponses.
 *     It seems that responses pile up here at browser startup, which
 *     means that some responses are hitting the observer, but aren't
 *     hitting the progress listener. This is probably another browser
 *     startup race, since we register the observer before the progress
 *     listener.
 */
net.horde.togglev6.HttpRequestObserver = {
	observe: function(subject, topic, data)  {
		if (net.horde.togglev6.debug) {
			net.horde.togglev6.console.logStringMessage(
				'HttpRequestObserver: seenResponses length: ' +
				net.horde.togglev6.seenResponses.length);
		}

		if (topic == 'http-on-modify-request') {
			++net.horde.togglev6.numPendingRequests;
			if (net.horde.togglev6.debug) {
				net.horde.togglev6.console.logStringMessage(
					'HttpRequestObserver request, pending: ' +
					net.horde.togglev6.numPendingRequests);
			}
		} else if (topic == 'http-on-examine-response') {
			var index = net.horde.togglev6.seenResponses.indexOf(subject);
			if (index == -1) {
				net.horde.togglev6.seenResponses.push(subject);
			}
			if (net.horde.togglev6.numPendingRequests > 0) {
				--net.horde.togglev6.numPendingRequests;
			}
			if (net.horde.togglev6.debug) {
				net.horde.togglev6.console.logStringMessage(
					'HttpRequestObserver response, pending: ' +
					net.horde.togglev6.numPendingRequests);
			}
		} else if (topic == 'http-on-examine-cached-response') {
			var index = net.horde.togglev6.seenResponses.indexOf(subject);
			if (index == -1) {
				net.horde.togglev6.seenResponses.push(subject);
			}
			if (net.horde.togglev6.numPendingRequests > 0) {
				--net.horde.togglev6.numPendingRequests;
			}
			if (net.horde.togglev6.debug) {
				net.horde.togglev6.console.logStringMessage(
					'HttpRequestObserver cached response, pending: ' +
					net.horde.togglev6.numPendingRequests);
			}
		}
	},

	register: function() {
		var observerService = Components
			.classes["@mozilla.org/observer-service;1"]
			.getService(Components.interfaces.nsIObserverService);
		observerService.addObserver(this,
			"http-on-modify-request", false);
		observerService.addObserver(this,
			"http-on-examine-response", false);
		observerService.addObserver(this,
			"http-on-examine-cached-response", false);
	},
}

net.horde.togglev6.PrefListener = {
	observe: function(subject, topic, prefName) {
		if (topic != 'nsPref:changed' ||
		    prefName != 'network.dns.disableIPv6') {
			return;
		}
		net.horde.togglev6.enablev6(
			net.horde.togglev6.prefs.getBoolPref('network.dns.disableIPv6'));
	},

	register: function() {
		net.horde.togglev6.prefs.QueryInterface(
			Components.interfaces.nsIPrefBranchInternal).
			addObserver('network.dns.disableIPv6', this, false);
	},
}

net.horde.togglev6.UninstallListener = {
	observe: function(subject, topic, data)  {
		if (topic == 'em-action-requested') {
			subject.QueryInterface(Components.interfaces.nsIUpdateItem);
			if (subject.id != net.horde.togglev6.uuid) {
				return;
			}

			if (data == 'item-uninstalled') {
				net.horde.togglev6.uninstalling = true;
			} else if (data == 'item-cancel-action') {
				net.horde.togglev6.uninstalling = false;
			}
		} else if (topic == 'quit-application-granted') {
			if (!net.horde.togglev6.uninstalling) {
				return;
			}

			var origSetting = net.horde.togglev6.prefs.getBoolPref(
				'extensions.net.horde.togglev6.origDisableIPv6');
			var curSetting = net.horde.togglev6.prefs.getBoolPref(
				'network.dns.disableIPv6');
			net.horde.togglev6.prefs.deleteBranch(
				'extensions.net.horde.togglev6');

			if (origSetting == curSetting) {
				/* No need to revert the setting. */
				return;
			}

			var prompts = Components
				.classes['@mozilla.org/embedcomp/prompt-service;1']
				.getService(Components.interfaces.nsIPromptService);

			var flags =
				prompts.BUTTON_POS_0 * prompts.BUTTON_TITLE_IS_STRING +
				prompts.BUTTON_POS_1 * prompts.BUTTON_TITLE_IS_STRING;
			if (origSetting) {
				var message = 'IPv6 was disabled when ToggleV6 was installed, but is now enabled. Disable IPv6 before uninstalling?';
			} else {
				var message = 'IPv6 was enabled when ToggleV6 was installed, but is now disabled. Enable IPv6 before uninstalling?';
			}

			var changeSetting = prompts.confirmEx(window,
				'Restore IPv6 setting?', message, flags,
				'Yes', 'No', '', null, {value: true});
			if (changeSetting == 0) {
				net.horde.togglev6.prefs.setBoolPref(
					'network.dns.disableIPv6', origSetting);
			}
		}
	},

	register: function() {
		var observerService = Components
			.classes['@mozilla.org/observer-service;1']
			.getService(Components.interfaces.nsIObserverService);
		observerService.addObserver(this,
			'em-action-requested', false);
		observerService.addObserver(this,
			'quit-application-granted', false);
	},
}

net.horde.togglev6.StatusListener = {
	QueryInterface: function(aIID) {
		if (aIID.equals(Components.interfaces.nsIWebProgressListener) ||
		    aIID.equals(Components.interfaces.nsISupportsWeakReference) ||
		    aIID.equals(Components.interfaces.nsISupports)) {
			return this;
		}
		throw Components.results.NS_NOINTERFACE;
	},

	onStateChange: function(aBrowser, aWebProgress, aRequest, aFlag, aStatus) {
		if (! (aFlag & Components.interfaces.nsIWebProgressListener.STATE_STOP)) {
			return;
		}

		if (net.horde.togglev6.debug) {
			net.horde.togglev6.console.logStringMessage(
				'StatusListener aFlag: ' + aFlag + ', ' +
				'aStatus: ' + aStatus);
			net.horde.togglev6.console.logStringMessage(
				'StatusListener seenResponses length: ' +
				net.horde.togglev6.seenResponses.length);
		}

		index = net.horde.togglev6.seenResponses.indexOf(aRequest);
		if (index != -1) {
			/* The observer has already decremented
			 * numPendingRequests for this response, remove the
			 * response state and return.
			 */
			if (net.horde.togglev6.debug) {
				net.horde.togglev6.console.logStringMessage('ignored response');
			}
			net.horde.togglev6.seenResponses.splice(index, 1);
			return;
		}

		if (net.horde.togglev6.numPendingRequests > 0) {
			--net.horde.togglev6.numPendingRequests;
		}
		/* Flush response state if there are no pending requests,
		 * as an additional hedge against "leaking" memory.
		 */
		if (net.horde.togglev6.numPendingRequests == 0) {
			net.horde.togglev6.seenResponses = new Array();
		}
		if (net.horde.togglev6.debug) {
			net.horde.togglev6.console.logStringMessage(
				'uninspected response --, pending: ' +
				net.horde.togglev6.numPendingRequests);
		}
	},

	onLocationChange: function(aProgress, aRequest, aURI) { },
	onProgressChange: function(aWebProgress, aRequest, curSelf, maxSelf, curTot, maxTot) { },
	onStatusChange: function(aWebProgress, aRequest, aStatus, aMessage) { },
	onSecurityChange: function(aWebProgress, aRequest, aState) { },

	register: function() {
		gBrowser.addTabsProgressListener(this,
			Components.interfaces.nsIWebProgress.NOTIFY_ALL);
	},
}

net.horde.togglev6.WaitUntilIdleListener = {
	_timer: null,

	cancel: function() {
		this._timer.cancel();
		this._timer = null;
	},

	run: function() {
		this._timer = Components.classes["@mozilla.org/timer;1"].
			createInstance(Components.interfaces.nsITimer);
		this._timer.init(this, 500,
			Components.interfaces.nsITimer.TYPE_REPEATING_SLACK);
	},

	isActive: function() {
		return this._timer != null;
	},

	observe: function(subject, topic, data) {
		if (!net.horde.togglev6.isNetworkIdle()) {
			net.horde.togglev6.updateStatusImage(true);
			return;
		}

		net.horde.togglev6.WaitUntilIdleListener.cancel();
		net.horde.togglev6.flushCache();
		net.horde.togglev6.updateStatusImage(false);
	},
}

net.horde.togglev6.enablev6 = function(desired) {
	this.desiredSetting = desired;

	if (this.isNetworkIdle()) {
		this.flushCache();
		this.updateStatusImage(false);
		return;
	}

	/* If we're waiting for the network to become idle and
	 * the status image is clicked again, cancel the pending
	 * request to toggle IPv6.
	 */
	if (this.WaitUntilIdleListener.isActive()) {
		this.WaitUntilIdleListener.cancel();
		this.updateStatusImage(false);
		return;
	}

	this.updateStatusImage(true);
	this.WaitUntilIdleListener.run();
}

net.horde.togglev6.flushCache = function() {
	this.prefs.setBoolPref('network.dns.disableIPv6',
		this.desiredSetting);

	var networkIoService =
		Components.classes["@mozilla.org/network/io-service;1"]
			.getService(Components.interfaces.nsIIOService);
	var wasOnline = !networkIoService.offline;
	networkIoService.offline = true;

	var cacheService =
		Components.classes["@mozilla.org/network/cache-service;1"]
			.getService(Components.interfaces.nsICacheService);
	cacheService.evictEntries(Components.interfaces.nsICache.STORE_IN_MEMORY);

	if (wasOnline) {
		networkIoService.offline = false;
	}

	this.desiredSetting = null;
}

net.horde.togglev6.init = function(e) {
	this.console = Components.classes["@mozilla.org/consoleservice;1"]
		.getService(Components.interfaces.nsIConsoleService);

	this.downloads = Components.classes["@mozilla.org/download-manager;1"].
		getService(Components.interfaces.nsIDownloadManager)

	this.prefs = Components.classes['@mozilla.org/preferences-service;1']
		.getService(Components.interfaces.nsIPrefBranch);

	this.windows = Components.classes['@mozilla.org/appshell/window-mediator;1']
		.getService(Components.interfaces.nsIWindowMediator);

	window.addEventListener('load', function() {
		var installed = net.horde.togglev6.prefs.getBoolPref(
			'extensions.net.horde.togglev6.installed');
		if (!installed) {
			net.horde.togglev6.prefs.setBoolPref(
				'extensions.net.horde.togglev6.origDisableIPv6',
				net.horde.togglev6.prefs.getBoolPref(
					'network.dns.disableIPv6'));
			net.horde.togglev6.prefs.setBoolPref(
				'extensions.net.horde.togglev6.installed', true);
		}

		net.horde.togglev6.UninstallListener.register();
		net.horde.togglev6.updateStatusImage(false);
		net.horde.togglev6.StatusListener.register();
		net.horde.togglev6.HttpRequestObserver.register();
		net.horde.togglev6.PrefListener.register();
	}, false);
}

net.horde.togglev6.isNetworkIdle = function() {
	if (net.horde.togglev6.debug) {
		this.console.logStringMessage(
			'isNetworkIdle(): numPendingRequests: ' +
			net.horde.togglev6.numPendingRequests);
	}

	/* Any pending requests? */
	if (net.horde.togglev6.numPendingRequests > 0) {
		return false;
	}

	/* Make sure browser tabs aren't loading anything, just to be safe. */
	var enumerator = this.windows.getEnumerator('');
	while (enumerator.hasMoreElements()) {
		var win = enumerator.getNext();
		var win_gBrowser = win.gBrowser;

		for (var i = 0; i < win_gBrowser.browsers.length; ++i) {
			if (win_gBrowser.getBrowserAtIndex(i).webProgress.isLoadingDocument) {
				return false;
			}
		}
	}

	/* Make sure the download manager doesn't have active downloads. */
	if (this.downloads.activeDownloadCount > 0) {
		return false;
	}

	return true;
}

net.horde.togglev6.updateStatusImage = function(toggleInProgress) {
	var enumerator = this.windows.getEnumerator('');
	while (enumerator.hasMoreElements()) {
		var win = enumerator.getNext();

		var statusImage = win.document.getElementById('togglev6-status-image');

		if (!toggleInProgress) {
			if (this.prefs.getBoolPref('network.dns.disableIPv6')) {
				statusImage.src = 'chrome://togglev6/content/ipv6-off.png';
				statusImage.tooltipText = 'IPv6 Disabled';
			} else {
				statusImage.src = 'chrome://togglev6/content/ipv6-on.png';
				statusImage.tooltipText = 'IPv6 Enabled';
			}
		} else {
			if (this.prefs.getBoolPref('network.dns.disableIPv6')) {
				statusImage.tooltipText = 'Enabling IPv6 once the network is idle...';
			} else {
				statusImage.tooltipText = 'Disabling IPv6 once the network is idle...';
			}

			if (statusImage.src == 'chrome://togglev6/content/ipv6-toggle0.png') {
				statusImage.src = 'chrome://togglev6/content/ipv6-toggle1.png';
			} else {
				statusImage.src = 'chrome://togglev6/content/ipv6-toggle0.png';
			}
		}
	}
}

net.horde.togglev6.init();
