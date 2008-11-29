##
# NetGrowler for Irssi by Anton Eriksson <antoneri@gmail.com>
# Based on growl.pl by Nelson Elhage and Toby Peterson.
#
# Usage:
#	Place this script in ~/.irssi/scripts
# 	Open/forward port 9887/udp in your firewall.
# 	Set up Growl to accept network notifications and enter a password.
# 	Change the values in $Password and $Hostname to match your settings.
# 	Inside Irssi do /run netgrowl
# 
# Requires Net::Growl (http://search.cpan.org/~nmcfarl/Net-Growl-0.99/lib/Net/Growl.pm)
#
# Please send improvements to back to me!
##

use strict;
use vars qw($VERSION %IRSSI $AppName $Password $Hostname);
use Irssi;
use Net::Growl;

$VERSION = '0.1';
%IRSSI = (
	author => 'Anton Eriksson',
	contact => 'antoneri@gmail.com',
	name => 'NetGrowler',
	description => 'Net::Growl notifications for Irssi', 
	licence => 'BSD'
);

$AppName = 'Irssi';
$Password = 'foobar';
$Hostname = 'growl-host';

register(host => $Hostname, application => $AppName, password => $Password);

sub send_notification ($$) {
	my ($title, $description) = @_;
	
	notify(host => $Hostname,
		   application => $AppName,
		   title => $title,
		   description => $description,
		   password => $Password,
		   priority => 0,
		   sticky => 0);
}

sub sig_message_private ($$$$) {
	my ($server, $data, $nick, $address) = @_;
	send_notification($nick, $data);
}

sub sig_print_text ($$$) {
	my ($dest, $text, $stripped) = @_;
	
	if ($dest->{level} & MSGLEVEL_HILIGHT) {
		send_notification($dest->{target}, $stripped);
	}
}

sub sig_notify_joined ($$$$$$) {
	my ($server, $nick, $user, $host, $realname, $away) = @_;
	send_notification($nick, "Has joined $server->{chatnet}");
}

sub sig_notify_left ($$$$$$) {
	my ($server, $nick, $user, $host, $realname, $away) = @_;
	send_notification($nick, "Has left $server->{chatnet}");	
}

Irssi::signal_add_last('message private', \&sig_message_private);
Irssi::signal_add_last('print text', \&sig_print_text);
Irssi::signal_add_last('notifylist joined', \&sig_notify_joined);
Irssi::signal_add_last('notifylist left', \&sig_notify_left);
