# -*- coding: utf-8 -*-
from __future__ import unicode_literals
from frappe import _

def get_data():
	return {
		"Mailbox": {
			"color": "blue",
			"icon": "octicon octicon-mail-read",
			"type": "module",
			"label": _("Mailbox")
		}
	}
