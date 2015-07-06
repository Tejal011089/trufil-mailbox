# -*- coding: utf-8 -*-
# Copyright (c) 2015, New Indictrans Technologies Pvt. Ltd. and contributors
# For license information, please see license.txt

from __future__ import unicode_literals
import frappe
from frappe.model.document import Document

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
		pass
		# if self.tag == 'Customer' and self.customer:
		# 	if not frappe.db.get_value('Contact',{"customer":self.customer,"email_id":self.from},"name"):
		# 		self.create_contact(contact_for="Customer")
		# 	self.append_mail_to_doc(doctype="Customer",docname=self.customer)

		# elif self.tag == 'Supplier' and self.supplier:
		# 	if not frappe.db.get_value('Contact',{"supplier":self.supplier,"email_id":self.from},"name"):
		# 		self.create_contact(contact_for="supplier")
		# 	self.append_mail_to_doc(doctype="Supplier",docname=self.supplier)



	def create_contact(self,contact_for):
		contact = frappe.get_doc({
			"doctype":"Contact",
			"first_name": self.sender_full_name,
			"email_id": self.from,
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



