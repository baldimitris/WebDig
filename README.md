# WebDig
WebDig is a software tool for post-processing and publishing data produced by archaeologic excavations. The tool is a web-app which presents the data on a map of the excavation site. It allows the users to preview, edit and categorize the data.

# Getting Started instructions
1. Copy all the files to your web server.
2. Visit the web server through a web browser.
3. Login as user 'admin', using password 'admin'.
4. Change the admin password for security reasons.
5. Create users by clicking on the admin username at the upper right corner.
6. The file index.html contains an example on how to incorporate the login form to a web-site. You can change this at will.
7. In order to import data from iDig into the web application do the following:

* export json files from iDig and retrieve them (can be done through i-tunes)
* upload the Preferences.json to the web server folder 'Data/'
* upload the json data file to the web server folder 'Data/' with the name iDig.json
* login as admin
* click at the username at the upper right corner and select 'import iDig data'. The software will provide instructions.

8. In order to import photographs from iDig into the web application do the following:

* upload the photographs to the web server folder 'Data/images\_for\_import/'. They have to be of jpeg format with extension '.jpg'.
* click at the username at the upper right corner and select 'import iDig images'. The software will provide instructions.
* in case the photographs are many, this step may need to be repeated several times, because php scripts expire after 30 sec

9. In order to import plans from iDig into the web application do the following:

* upload the plan images to the web server folder 'plans/'

10\. Open Preferences.json at the web server folder 'Data/' and edit the following settings to meet the excavation needs:

* VisibleItemFields: the field names which will be visible to the user at the item-info dialog.
* EditableItemFields: the field names which the user will be allowed to edit at the item-info dialog.
* DefaultTrench: the name of the trench which will be displayed when the web application is launched.
* DefaultPlan: the name of the plan which will be displayed when the web application is launched.
* Plan\_GeoReferencing\_field: can be "FormatImageEnvelopeGEO" or "FormatImageEnvelopeXYZ". It is the field of the Plan item on which the geo-referencing is based.
* ItemsList\_SortByFields: a list of field names by which the items list will be sorted.
* Permissions\_html: the html text which is displayed at the Permissions dialog.
* About\_html: the html text to be added to the text which is displayed at the About dialog.
* Colors: the colors of some map elements and of the different types of items.

11\. For security reasons, the RSA key should be changed:

* issue an RSA key (command ssh-keygen in Linux systems).
* upload the key to the web server (file name webdig\_key\_rsa).
* inside index.html alter the values of PublicExponent\_hex and PublicModulus\_hex
* inside WebDigServer.php alter the line '$private\_key = openssl\_pkey\_get\_private...'

12\. Maintenance

* The software keeps zipped backup copies of the data (ExcavationData.json) automatically when changes are made. These backup files are located at "Data/backup" folder. Older backup files should be periodically erased to ensure that they do not occupy a lot of space.
* The file "log.txt", which holds system events, like signing in and altering data can grow large
* The following command can provide information about the web-server status: https://my-basic-url.com/WebDigServer.php?cmd=info
