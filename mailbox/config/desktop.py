# -*- coding: utf-8 -*-
from __future__ import unicode_literals
from frappe import _

def get_data():
	return {
		"Mailbox": {
			"color": "#5ac8fb",
			"icon": "octicon octicon-mail-read",
			"type": "module",
			"label": _("Mailbox")
		},
		"DMS": {
			"color": "#e67e22",
			"icon": "icon-play",
			"icon": "icon-file-alt",
			"label": _("DMS"),
			"link": "dms",
			"type": "page"
		},
	}
