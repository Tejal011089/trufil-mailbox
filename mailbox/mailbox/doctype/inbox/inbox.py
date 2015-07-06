# -*- coding: utf-8 -*-
# Copyright (c) 2015, New Indictrans Technologies Pvt. Ltd. and contributors
# For license information, please see license.txt

from __future__ import unicode_literals
import frappe 
from frappe.model.document import Document
from frappe.utils import cint

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


		from frappe.desk.form.load import get_attachments
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


			





