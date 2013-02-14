"""
rest api for administrative interface
refer to documentation
"""

from flask import Blueprint, render_template, request, url_for, current_app, Response, abort
from flask.views import MethodView
from bson import ObjectId
from slideatlas import slconn as conn
from slideatlas import admindb
from slideatlas import model
from slideatlas import common_utils
from celery.platforms import resource
from slideatlas.common_utils import jsonify
from slideatlas.model.database import Database

mod = Blueprint('api', __name__,
                url_prefix="/apiv1",
                template_folder="templates",
                static_folder="static",
                )

# The url valid for databases, rules and users with supported queries
class AdminDBAPI(MethodView):
    decorators = [common_utils.user_required]

    def get(self, restype, resid):
        if resid == None:
            return "You want alist of %s" % (restype)
        else:
            if restype == "attachments":
                return "You want %s, %s" % (restype, resid)
            else:
                return "You want %s, %s" % (restype, resid)

    def post(self, restype):
        # create a new user
        if restype == "rules":
                return "You want to post rule"
        elif restype == 'databases':
                return "You want to add database"
        elif restype == 'users':
            # Posting to users means typically adding new rules to users
            return "You want to add database"
        pass

    def delete(self, resid):
        # Verify the access
        # Remove one instance
        # and remove the given resource
        # Not implemented right now
        pass

    def put(self, restype, resid):
        # update some information
        pass

# The url valid for databases, rules and users with supported queries
class DatabaseAPI(AdminDBAPI):
    @common_utils.site_admin_required
    def get(self, resid):
        dbobjs = conn[current_app.config["CONFIGDB"]]["databases"].find()
        dbobjarray = list()
        for adbobj in dbobjs:
            print adbobj
            dbobjarray.append(adbobj)

        if resid == None:
            return jsonify({'databases':dbobjarray})
        else:
            obj = conn[current_app.config["CONFIGDB"]]["databases"].find_one({"_id" : ObjectId(resid)})
            if obj :
                return jsonify(obj)
            else:
                return Response("", status=405)

    @common_utils.site_admin_required
    def delete(self, resid):
        obj = conn[current_app.config["CONFIGDB"]]["databases"].find_one({"_id" : ObjectId(resid)})
        if obj :
            conn[current_app.config["CONFIGDB"]]["databases"].remove({"_id" : obj["_id"]})
            return Response("{}", status=200)
        else:
            # Invalid request if the object is not found
            return Response("{\"error\" : \"Id Not found \"} ", status=405)

    @common_utils.site_admin_required
    def post(self, resid=None):
        # post requires admin access

        # Parse the data in json format 
        data = request.json

        # Unknown request if no parameters 
        if data == None:
            abort(400)

        # Only insert command is supported
        if not data.has_key("insert"):
            abort(400)

        # Create the database object from the supplied parameters  
        conn.register([Database])
        try:
            newdb = conn[current_app.config["CONFIGDB"]]["databases"].Database()
            newdb["label"] = data["insert"]["label"]
            newdb["host"] = data["insert"]["host"]
            newdb["dbname"] = data["insert"]["dbname"]
            newdb["copyright"] = data["insert"]["copyright"]
            newdb.validate()
            newdb.save()
        except Exception as inst:
            # If valid database object cannot be constructed it is invalid request 
            return Response("{\"error\" : %s}" % str(inst), status=405)

        return jsonify(newdb)

    @common_utils.site_admin_required
    def put(self, resid):
        # put requires admin access

        # Get json supplied 
        data = request.json

        # Check for valid parameters 
        # Check if no parameters 
        if data == None:
            return Response("{\"error\" : \"No parameters ? \"}", status=405)

        # See if id matches the resource being modified
        try:
            if data["_id"] != resid:
                raise 1
        except:
                return Response("{\"error\" : \"_id mismatch with the location in the url \"}", status=405)

        # Try to see if the data can create valid object 
        conn.register([Database])

        # The object should exist
        dbobj = conn[current_app.config["CONFIGDB"]]["databases"].Database.find_one({"_id" : ObjectId(resid)})

        # Unknown request if no parameters 
        if dbobj == None:
            return Response("{\"error\" : \"Resource _id: %s  doesnot exist\"}" % (resid), status=403)

        # Create the database object from the supplied parameters  
        try:
            dbobj["label"] = data["label"]
            dbobj["host"] = data["host"]
            dbobj["dbname"] = data["dbname"]
            dbobj["copyright"] = data["copyright"]
            dbobj.validate()
            dbobj.save()
        except Exception as inst:
            # If valid database object cannot be constructed it is invalid request 
            return Response("{\"error\" : %s}" % str(inst), status=405)

        return jsonify(dbobj)

#        if restype == 'databases':
#                return "You want to add database"
#        elif restype == "rules":
#                return "You want to post rule"
#        elif restype == 'users':
#            # Posting to users means typically adding new rules to users
#            return "You want to add database"
#        pass

mod.add_url_rule('/databases', defaults={"resid" : None}, view_func=DatabaseAPI.as_view("show_database_list"), methods=['get', 'post'])
mod.add_url_rule('/databases/<regex("[a-f0-9]{24}"):resid>', view_func=DatabaseAPI.as_view("show_database"), methods=['get', 'DELETE', 'put'])

mod.add_url_rule('/<regex("(users|rules)"):restype>', defaults={"resid" : None}, view_func=AdminDBAPI.as_view("show_resource_list"))
mod.add_url_rule('/<regex("(users|rules)"):restype>/<regex("[a-f0-9]{24}"):resid>', view_func=AdminDBAPI.as_view("show_resource"))


# The url valid for databases, rules and users with supported queries
class DataSessionItemsAPI(MethodView):
    decorators = [common_utils.user_required]

    def get(self, dbid, sessid, restype, resid):
        if resid == None:
            return "You want alist of %s/%s/%s" % (dbid, sessid, restype)
        else:
            if restype == "attachments":
                return "You want list of attachments in %s/%s" % (dbid, sessid)
            else:
                return "You want list of views in %s/%s" % (dbid, sessid)


# For a list of resources within session
mod.add_url_rule('/<regex("[a-f0-9]{24}"):dbid>'
                                '/sessions'
                                '/<regex("[a-f0-9]{24}"):sessid>'
                                '/<regex("(attachments|views)"):restype>', view_func=DataSessionItemsAPI.as_view("show_session_item_list"), defaults={"resid" : None})

# For a list of resources within session
mod.add_url_rule('/<regex("[a-f0-9]{24}"):dbid>'
                                '/sessions'
                                '/<regex("[a-f0-9]{24}"):sessid>'
                                '/<regex("(attachments|views)"):restype>'
                                '/<regex("[a-f0-9]{24}"):ressid>', view_func=DataSessionItemsAPI.as_view("show_session_item"))

# Specially for session

# For a list of sessions
mod.add_url_rule('/<regex("[a-f0-9]{24}"):dbid>'
                                '/sessions', view_func=DataSessionItemsAPI.as_view("show_session_list"), defaults={"resid" : None, "restype" : None, "sessid" : None})

# For a particular session (May not be needed)
@mod.route('/<regex("[a-f0-9]{24}"):dbid>'
                        '/sessions'
                        '/<regex("[a-f0-9]{24}"):sessid>', defaults={"resid" : None, "restype" : None})
@common_utils.user_required

# For a list of resources within session
#@mod.route('/<regex("[a-f0-9]{24}"):dbid>'
#                        '/sessions'
#                        '/<regex("[a-f0-9]{24}"):sessid>'
#                        '/<regex("(attachments|views)"):restype>', defaults={"resid" : None})

## For a particular resource within session
#@mod.route('/<regex("[a-f0-9]{24}"):dbid>'
#                        '/sessions'
#                        '/<regex("[a-f0-9]{24}"):sessid>'
#                        '/<regex("(attachments|views)"):restype>'
#                        '/<regex("[a-f0-9]{24}"):resid>')

def session_object_request(dbid, sessid, restype, resid):
    """
                                    "/apiv1/5074589002e31023d4292d83/sessions",
                                    "/apiv1/5074589002e31023d4292d83/sessions/5074589002e31023d4292d83",

                                    "/apiv1/5074589002e31023d4292d83/sessions/5074589002e31023d4292d83/views",
                                    "/apiv1/5074589002e31023d4292d83/sessions/5074589002e31023d4292d83/views/5074589002e31023d4292d83",

                                    "/apiv1/5074589002e31023d4292d83/sessions/5074589002e31023d4292d83/attachments",
                                    "/apiv1/5074589002e31023d4292d83/sessions/5074589002e31023d4292d83/attachments/5074589002e31023d4292d83",
    """
    # See if the user is requesting any session id
    return "you want : %s, %s, %s, %s" % (dbid, sessid, restype, resid)

# Render admin template
@mod.route('/admin')
def admin_main():
    """
    Single page application with uses this rest API to interactively do tasks
    """
    return Response(render_template("admin.html"))
