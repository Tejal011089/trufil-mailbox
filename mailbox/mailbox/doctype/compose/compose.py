# -*- coding: utf-8 -*-
# Copyright (c) 2015, New Indictrans Technologies Pvt. Ltd. and contributors
# For license information, please see license.txt

from __future__ import unicode_literals
import frappe
from frappe.model.document import Document
from mailbox.mailbox.doctype.inbox.inbox import get_recipients,prepare_attachments
from email.utils import formataddr, parseaddr
import os, base64, re
import hashlib
import mimetypes
from frappe.utils import get_site_path, get_hook_method, get_files_path, random_string, encode, cstr,validate_email_add
from frappe import _
from frappe import conf
from copy import copy
import mailbox

class Compose(Document):
	pass

def upload():
	# get record details
	file_url = frappe.form_dict.file_url
	filename = frappe.form_dict.filename
	ref_no = frappe.form_dict.ref_no

	if not filename and not file_url:
		frappe.msgprint(_("Please select a file or url"),
			raise_exception=True)

	# save
	if filename:
		filedata = save_uploaded(ref_no)
	elif file_url:
		filedata = save_url(file_url_no)

	return {
		"name": filedata.name,
		"file_name": filedata.file_name,
		"file_url": filedata.file_url,
	}

def save_uploaded(ref_no):
	fname, content = get_uploaded_content()
	if content:
		return save_file(fname, content,ref_no);
	else:
		raise Exception

def save_url(file_url,ref_no):
	# if not (file_url.startswith("http://") or file_url.startswith("https://")):
	# 	frappe.msgprint("URL must start with 'http://' or 'https://'")
	# 	return None, None

	f = frappe.get_doc({
		"doctype": "Compose",
		"file_url": file_url,
		"ref_no":ref_no
	})
	f.flags.ignore_permissions = True
	try:
		f.insert();
	except frappe.DuplicateEntryError:
		return frappe.get_doc("File Data", f.duplicate_entry)
	return f

def get_uploaded_content():
	# should not be unicode when reading a file, hence using frappe.form
	if 'filedata' in frappe.form_dict:
		if "," in frappe.form_dict.filedata:
			frappe.form_dict.filedata = frappe.form_dict.filedata.rsplit(",", 1)[1]
		frappe.uploaded_content = base64.b64decode(frappe.form_dict.filedata)
		frappe.uploaded_filename = frappe.form_dict.filename
		return frappe.uploaded_filename, frappe.uploaded_content
	else:
		frappe.msgprint(_('No file attached'))
		return None, None


def save_file(fname, content,ref_no,decode=False):
	if decode:
		if isinstance(content, unicode):
			content = content.encode("utf-8")

		if "," in content:
			content = content.split(",")[1]
		content = base64.b64decode(content)

	file_size = check_max_file_size(content)
	content_hash = get_content_hash(content)
	content_type = mimetypes.guess_type(fname)[0]
	fname = get_file_name(fname, content_hash[-6:])
	file_data = get_file_data_from_hash(content_hash)
	if not file_data:
		method = get_hook_method('write_file', fallback=save_file_on_filesystem)
		file_data = method(fname, content, content_type=content_type)
		file_data = copy(file_data)

	file_data.update({
		"doctype": "Compose",
		"file_size": file_size,
		"ref_no":ref_no
	})

	f = frappe.get_doc(file_data)
	f.flags.ignore_permissions = True
	try:
		f.insert();
	except frappe.DuplicateEntryError:
		return frappe.get_doc("File Data", f.duplicate_entry)
	return f

def get_file_data_from_hash(content_hash):
	for name in frappe.db.sql_list("select name from `tabFile Data` where content_hash=%s", content_hash):
		b = frappe.get_doc('File Data', name)
		return {k:b.get(k) for k in frappe.get_hooks()['write_file_keys']}
	return False

def save_file_on_filesystem(fname, content, content_type=None):
	public_path = os.path.join(frappe.local.site_path, "public")
	fpath = write_file(content, get_files_path(), fname)
	path =  os.path.relpath(fpath, public_path)
	return {
		'file_name': os.path.basename(path),
		'file_url': '/' + path
	}

def check_max_file_size(content):
	max_file_size = conf.get('max_file_size') or 5242880
	file_size = len(content)

	if file_size > max_file_size:
		frappe.msgprint(_("File size exceeded the maximum allowed size of {0} MB").format(
			max_file_size / 1048576),
			raise_exception=MaxFileSizeReachedError)

	return file_size

def write_file(content, file_path, fname):
	"""write file to disk with a random name (to compare)"""
	# create directory (if not exists)
	frappe.create_folder(get_files_path())
	# write the file
	with open(os.path.join(file_path.encode('utf-8'), fname.encode('utf-8')), 'w+') as f:
		f.write(content)
	return get_files_path(fname)

def remove_all(dt, dn):
	"""remove all files in a transaction"""
	try:
		for fid in frappe.db.sql_list("""select name from `tabFile Data` where
			attached_to_doctype=%s and attached_to_name=%s""", (dt, dn)):
			remove_file(fid, dt, dn)
	except Exception, e:
		if e.args[0]!=1054: raise # (temp till for patched)

def remove_file_by_url(file_url, doctype=None, name=None):
	if doctype and name:
		fid = frappe.db.get_value("File Data", {"file_url": file_url,
			"attached_to_doctype": doctype, "attached_to_name": name})
	else:
		fid = frappe.db.get_value("File Data", {"file_url": file_url})

	if fid:
		return remove_file(fid)

def remove_file(fid, attached_to_doctype=None, attached_to_name=None):
	"""Remove file and File Data entry"""
	file_name = None
	if not (attached_to_doctype and attached_to_name):
		attached = frappe.db.get_value("File Data", fid,
			["attached_to_doctype", "attached_to_name", "file_name"])
		if attached:
			attached_to_doctype, attached_to_name, file_name = attached

	ignore_permissions, comment = False, None
	if attached_to_doctype and attached_to_name:
		doc = frappe.get_doc(attached_to_doctype, attached_to_name)
		ignore_permissions = doc.has_permission("write") or False
		if not file_name:
			file_name = frappe.db.get_value("File Data", fid, "file_name")
		comment = doc.add_comment("Attachment Removed", _("Removed {0}").format(file_name))

	frappe.delete_doc("File Data", fid, ignore_permissions=ignore_permissions)

	return comment

def delete_file_data_content(doc):
	method = get_hook_method('delete_file_data_content', fallback=delete_file_from_filesystem)
	method(doc)

def delete_file_from_filesystem(doc):
	path = doc.file_name

	if path.startswith("files/"):
		path = frappe.utils.get_site_path("public", doc.file_name)
	else:
		path = frappe.utils.get_site_path("public", "files", doc.file_name)

	path = encode(path)

	if os.path.exists(path):
		os.remove(path)

def get_file(fname):
	f = frappe.db.sql("""select file_name from `tabCompose`
		where name=%s or file_name=%s""", (fname, fname))
	if f:
		file_name = f[0][0]
	else:
		file_name = fname

	file_path = file_name

	if not "/" in file_path:
		file_path = "files/" + file_path

	# read the file
	with open(get_site_path("public", file_path), 'r') as f:
		content = f.read()

	return [file_name, content]

def get_content_hash(content):
	return hashlib.md5(content).hexdigest()

def get_file_name(fname, optional_suffix):
	# convert to unicode
	fname = cstr(fname)

	n_records = frappe.db.sql("select name from `tabFile Data` where file_name=%s", fname)
	if len(n_records) > 0 or os.path.exists(encode(get_files_path(fname))):
		f = fname.rsplit('.', 1)
		if len(f) == 1:
			partial, extn = f[0], ""
		else:
			partial, extn = f[0], "." + f[1]
		return '{partial}{suffix}{extn}'.format(partial=partial, extn=extn, suffix=optional_suffix)
	return fname

@frappe.whitelist()
def get_attachments(ref_no):
	return frappe.get_all("Compose", fields=["file_name"],
		filters = {"ref_no": ref_no})

@frappe.whitelist()
def make(doctype=None, name=None, content=None, subject=None, sent_or_received = "Sent",
	sender=None, recipients=None, communication_medium="Email", send_email=False,
	print_html=None, print_format=None, attachments='[]', ignore_doctype_permissions=False,
	send_me_a_copy=False,ref_no=None):


	if not sender and frappe.session.user != "Administrator":
		sender = frappe.db.get_value("Email Config",{"default_account":1,"user":frappe.session.user},"email_id")

	if not validated_email_addrs(recipients):
		return {"not_valid":1}

	comm = frappe.get_doc({
		"doctype":"Outbox",
		"subject": subject,
		"content": content,
		"sender": sender,
		"recipients": recipients,
	})
	comm.insert(ignore_permissions=True)

	attachments = get_attachments(ref_no)
	for attachment in attachments:
		file_data = {}
		furl = "/files/%s"%attachment["file_name"]
		file_data.update({
			"doctype": "File Data",
			"attached_to_doctype":"Outbox",
			"attached_to_name":comm.name,
			"file_url":furl,
			"file_name":attachment["file_name"]
			
		})
		f = frappe.get_doc(file_data)
		f.flags.ignore_permissions = True
		f.insert();

	recipients = get_recipients(recipients)

	attachments = [attachment["file_name"] for attachment in attachments]
	attachments = prepare_attachments(attachments)
	
	mailbox.sendmail(
		recipients=recipients,
		sender=sender,
		subject=subject,
		content=content,
		attachments=attachments
	)

	return {
		"name": comm.name,
		"recipients": ", ".join(recipients) if recipients else None
	}

def validated_email_addrs(recipients):
	recipients = get_recipients(recipients)
	for recipient in recipients:
		if not validate_email_add(recipient):
			return False
	return True

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

@frappe.whitelist()
def validate():
	if not frappe.db.get_value("Email Config",
		{"user":frappe.session.user,
		"default_account":1},"name"):
		return {"default":False}
	else:
		return {"default":True}