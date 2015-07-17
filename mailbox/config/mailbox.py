from __future__ import unicode_literals
from frappe import _

def get_data():
	return [
		{
			"label": _("Documents"),
			"icon": "icon-star",
			"items": [
				{
					"type": "doctype",
					"name": "Inbox",
					"description": _("Inbox For configured mails")
				},
				{
					"type": "doctype",
					"name": "Outbox",
					"description": _("sent mails")
				}
			]
		},
		{
			"label": _("Setup"),
			"icon": "icon-cog",
			"items": [
				{
					"type": "doctype",
					"name": "Email Config",
					"description": _("POP3 and SMTP Configuration")
				},
				{
					"type": "doctype",
					"name": "Tag",
					"description": _("Tagging for Incoming mails")
				},
				{
					"type": "doctype",
					"name": "DMS",
					"description": _("Configure Which Documents To Be shown on DMS")
				},
			]
		}
	]
