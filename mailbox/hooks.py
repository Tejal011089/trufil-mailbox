# -*- coding: utf-8 -*-
from __future__ import unicode_literals

app_name = "mailbox"
app_title = "Mailbox"
app_publisher = "New Indictrans Technologies Pvt. Ltd."
app_description = "Configure and get all mails from inbox.configured by pop3"
app_icon = "octicon octicon-mail-read"
app_color = "#5ac8fb"
app_email = "conatct@indictranstech.com"
app_version = "0.0.1"

# Includes in <head>
# ------------------

# include js, css files in header of desk.html
# app_include_css = "/assets/mailbox/css/mailbox.css"
# app_include_js = "/assets/mailbox/js/mailbox.js"

# include js, css files in header of web template
# web_include_css = "/assets/mailbox/css/mailbox.css"
# web_include_js = "/assets/mailbox/js/mailbox.js"

# Home Pages
# ----------

# application home page (will override Website Settings)
# home_page = "login"

# website user home page (by Role)
# role_home_page = {
#	"Role": "home_page"
# }

# Generators
# ----------

# automatically create page for each record of this doctype
# website_generators = ["Web Page"]

# Installation
# ------------

# before_install = "mailbox.install.before_install"
# after_install = "mailbox.install.after_install"

# Desk Notifications
# ------------------
# See frappe.core.notifications.get_notification_config

# notification_config = "mailbox.notifications.get_notification_config"

# Permissions
# -----------
# Permissions evaluated in scripted ways

# permission_query_conditions = {
# 	"Event": "frappe.desk.doctype.event.event.get_permission_query_conditions",
# }
#
# has_permission = {
# 	"Event": "frappe.desk.doctype.event.event.has_permission",
# }

# Document Events
# ---------------
# Hook on document methods and events

# doc_events = {
# 	"*": {
# 		"on_update": "method",
# 		"on_cancel": "method",
# 		"on_trash": "method"
#	}
# }

# Scheduled Tasks
# ---------------

scheduler_events = {
	"all": [
		"mailbox.mailbox.doctype.email_config.email_config.pull"
	]
}

# Testing
# -------

# before_tests = "mailbox.install.before_tests"

# Overriding Whitelisted Methods
# ------------------------------
#
# override_whitelisted_methods = {
# 	"frappe.desk.doctype.event.event.get_events": "mailbox.event.get_events"
# }

fixtures = ["Tag"]