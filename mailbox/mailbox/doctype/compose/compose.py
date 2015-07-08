# -*- coding: utf-8 -*-
# Copyright (c) 2015, New Indictrans Technologies Pvt. Ltd. and contributors
# For license information, please see license.txt

from __future__ import unicode_literals
import frappe
from frappe.model.document import Document
from mailbox.mailbox.doctype.inbox.inbox import get_recipients,prepare_attachments
from frappe.desk.form.load import get_attachments

class Compose(Document):
	def on_update(self):
		sender = ''
		if not sender and frappe.session.user != "Administrator":
			sender = get_formatted_email(frappe.session.user)

	
		comm = frappe.get_doc({
			"doctype":"Outbox",
			"subject": self.subject,
			"content": self.content,
			"sender": sender,
			"recipients": self.recipients,
		})
		comm.insert(ignore_permissions=True)

		attachments = get_attachments(self.doctype,self.name)
		for attachment in attachments:
			file_data = {}
			file_data.update({
				"doctype": "File Data",
				"attached_to_doctype":"Outbox",
				"attached_to_name":comm.name,
				"file_url":attachment["file_url"],
				"file_name":attachment["file_name"]
				
			})
			f = frappe.get_doc(file_data)
			f.flags.ignore_permissions = True
			f.insert();

		recipients = get_recipients(self.recipients)
		attachments = prepare_attachments(attachments)
		
		frappe.sendmail(
			recipients = recipients,
			sender = sender,
			subject = self.subject,
			content = self.content,
			attachments = attachments,
			bulk = True
		)
