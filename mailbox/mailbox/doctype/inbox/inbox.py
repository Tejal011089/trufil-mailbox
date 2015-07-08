# -*- coding: utf-8 -*-
# Copyright (c) 2015, New Indictrans Technologies Pvt. Ltd. and contributors
# For license information, please see license.txt

from __future__ import unicode_literals
import frappe 
from frappe.model.document import Document
from email.utils import formataddr, parseaddr
from frappe.utils import get_url, get_formatted_email, cstr, cint
from frappe.utils.file_manager import get_file
import frappe.email.smtp
from frappe import _
from frappe.desk.form.load import get_attachments

class Inbox(Document):
	def on_update(self):
		self.attach_mail_to_customer_or_supplier()

	def attach_mail_to_customer_or_supplier(self):
		"""
			If mail tagged by Customer or supplier attach that mail to respective
			supplier and  customer
			Check these contact exsits for which customer or supplier get that supplier or customer 
			and attach mail in his comment section
		"""
		frappe.errprint(self.tagged)
		if self.tag == 'Customer' and self.customer and not cint(self.get("tagged")):
			if not frappe.db.get_value('Contact',{"customer":self.customer,"email_id":self.sender},"name"):
				self.create_contact(contact_for="Customer")
			
			self.append_mail_to_doc("Customer",self.customer)
			self.tagged = 1

		elif self.tag == 'Supplier' and self.supplier and not cint(self.get("tagged")):
			if not frappe.db.get_value('Contact',{"supplier":self.supplier,"email_id":self.sender},"name"):
				self.create_contact(contact_for="supplier")

			self.append_mail_to_doc("Supplier",self.supplier)
			self.tagged = 1


	def create_contact(self,contact_for):
		contact = frappe.get_doc({
			"doctype":"Contact",
			"first_name": self.sender_full_name,
			"email_id": self.sender,
		})

		if contact_for == 'Customer':
			contact.update({
				"customer":self.customer
			})

		if contact_for == 'Supplier':
			contact.update({
				"supplier":self.supplier
			})

		contact.insert(ignore_permissions=True)

	def append_mail_to_doc(self,doctype,docname):
	
		comm = frappe.get_doc({
			"doctype":"Communication",
			"subject": self.subject,
			"content": self.content,
			"sender": self.sender,
			"communication_medium": "Email",
			"sent_or_received": "Received",
			"reference_doctype":doctype,
			"reference_name": docname
		})
		comm.insert(ignore_permissions=True)


		attachments = get_attachments(self.doctype, self.name)
		for attachment in attachments:
			file_data = {}
			file_data.update({
				"doctype": "File Data",
				"attached_to_doctype":"Communication",
				"attached_to_name":comm.name,
				"file_url":attachment["file_url"],
				"file_name":attachment["file_name"]
				
			})
			f = frappe.get_doc(file_data)
			f.flags.ignore_permissions = True
			f.insert();


			
@frappe.whitelist()
def make(doctype=None, name=None, content=None, subject=None, sent_or_received = "Sent",
	sender=None, recipients=None, communication_medium="Email", send_email=False,
	print_html=None, print_format=None, attachments='[]', ignore_doctype_permissions=False,
	send_me_a_copy=False):


	if not sender and frappe.session.user != "Administrator":
		sender = get_formatted_email(frappe.session.user)

	
	comm = frappe.get_doc({
		"doctype":"Outbox",
		"subject": subject,
		"content": content,
		"sender": sender,
		"recipients": recipients,
	})
	comm.insert(ignore_permissions=True)

	attachments = get_attachments(doctype,name)
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

	recipients = get_recipients(recipients)
	attachments = prepare_attachments(attachments)
	frappe.sendmail(
		recipients=recipients,
		sender=sender,
		subject=subject,
		content=content,
		attachments=attachments,
		bulk=True
	)

	return {
		"name": comm.name,
		"recipients": ", ".join(recipients) if recipients else None
	}

def get_recipients(recipients):
	original_recipients = [s.strip() for s in cstr(recipients).split(",")]
	recipients = original_recipients[:]
	filtered = []
	for e in list(set(recipients)):
		email_id = parseaddr(e)[1]
		if e not in filtered and email_id not in filtered:
				filtered.append(e)
	return filtered
	
def prepare_attachments(g_attachments=None):
	attachments = []
	if g_attachments:
		if isinstance(g_attachments, basestring):
			import json
			g_attachments = json.loads(g_attachments)

			for a in g_attachments:
				if isinstance(a, basestring):
					# is it a filename?
					try:
						file = get_file(a)
						attachments.append({"fname": file[0], "fcontent": file[1]})
					except IOError:
						frappe.throw(_("Unable to find attachment {0}").format(a))
				else:
					attachments.append(a)
	return attachments				



