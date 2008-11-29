/*
 * Copyright (c) 1999, 2000-2, John Morrissey <jwm@horde.net>
 *
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 2 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program; if not, write to the Free Software
 * Foundation, Inc., 59 Temple Place, Suite 330, Boston, MA  02111-1307, USA.
 *
 * Credit should really go to the Logjam authors; I essentially copied
 * this from the Logjam source and reworked it a bit.
 */

#include <dlfcn.h>
#include <errno.h>
#include <stdio.h>

static void *xmms_dl = NULL;

unsigned short int
xmms_load_ok(void)
{
	/* If we've already dlopen()ed, don't bother doing it again. */
	if (xmms_dl)
		return 1;

	if (! (xmms_dl = dlopen("libxmms.so", RTLD_LAZY)))
		if (! (xmms_dl = dlopen("libxmms.so.1", RTLD_LAZY)))
			return 0; /* Couldn't find the shared library. */

	return 1;
}

char *
xmms_grab(void)
{
	char *text;

	static int    (*xrgpp)(int)      = NULL;
	static char * (*xrgpt)(int, int) = NULL;

	if (xrgpp == NULL) {
		xrgpp = dlsym(xmms_dl, "xmms_remote_get_playlist_pos");
		if (dlerror()) {
			perror("dlsym(\"xmms_remote_get_playlist_pos\")");
			return NULL;
		}
	}
	if (xrgpt == NULL) {
		xrgpt = dlsym(xmms_dl, "xmms_remote_get_playlist_title");
		if (dlerror()) {
			perror("dlsym(\"xmms_remote_get_playlist_title\")");
			return NULL;
		}
	}
	
	return xrgpt(0, xrgpp(0));
}

int
main(void)
{
	char *song;

	if (! xmms_load_ok()) {
		printf("Unable to load libxmms: %s\n", strerror(errno));
		return 1;
	}

	song = xmms_grab();
	printf("%s\n", song ? song : "None.");
	return 0;
}
