from flask import Blueprint, Response, abort, jsonify, request, current_app
from slideatlas import slconn as conn, admindb
import mongokit
import json
from bson import ObjectId
mod = Blueprint('db_operations', __name__)
from slideatlas import model


@mod.route('/modify')
def modify():
    """
    Locates a record based on ID and modifies a particular field to new value
    """
    # Get the parameters
    id = request.args.get('_id', None)
    collection = request.args.get('collection', None)
    fields = json.loads(request.args.get('fields', "{}"))
    db = request.args.get('db', None)


    # If not enough information return error
    if id == None or collection == None  or db == None:
        data = {"error" : 1, "message" : "_id, collection and database are all required"}
        return jsonify(data)

    conn.register([model.Database])
    admindb2 = conn[current_app.config["CONFIGDB"]]
    dbobj = admindb2["databases"].find_one({"_id" : ObjectId(db)})

    # TODO: Make sure that the caller has access rights for modification 

    col = conn[dbobj["dbname"]][collection]
    rec = col.find_one({ "_id" : ObjectId(id) })
    if rec == None:
        data = {"error" : 1, "message" : "Unable to locate record"}
        return jsonify(data)

    updated = False

    for akey in fields:
        if akey in rec:
            col.update({"_id" : rec["_id"]}, { "$set" : { akey : fields[akey] } })
            updated = True

    # Make sure the obtained record has the field we want to modify and validate
        data = {'success': 1, 'id' : id, 'fields' : fields}
    return jsonify(data)

def fix():
    """
    For procedural commands processing over sessions or images or etc
    """
    pass
