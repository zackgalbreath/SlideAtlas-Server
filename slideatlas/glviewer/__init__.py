from flask import Blueprint, render_template, request, url_for
from bson import ObjectId
from slideatlas import slconn as conn
from slideatlas import model

mod = Blueprint('glviewer', __name__,
                template_folder="templates",
                static_folder="static",
                url_prefix="/webgl-viewer"
                )

@mod.route('')
def glview_single():
    """
    - /glview?imgid=10239094124  searches for the session id
    """

    # See if the user is requesting any session id
    imgid = request.args.get('img', None)
    db = request.args.get('db', None)

    if not imgid:
        imgid = '4f2808554834a30ccc000001'

    if not db:
        db = '5074589002e31023d4292d83'

    conn.register([model.Database])
    admindb = conn["slideatlasv2"]
    dbobj = admindb["databases"].find_one({"_id" : ObjectId(db)})
    imgdb = conn[dbobj['dbname']]
    imgcollection = imgdb["images"]
    myimage = imgcollection.find_one({'_id':ObjectId(imgid)})
    
    img = {}
    img["collection"] = str(myimage["_id"])
    img["origin"] = str(myimage["origin"])
    img["spacing"] = str(myimage["spacing"])

    return render_template('viewer.html', img = img, db = db)
    
    
    
    
@mod.route('/dual')
def glview_dual():
    """
    - /glview?imgid=10239094124  searches for the session id
    """

    # See if the user is requesting any session id
    qid = request.args.get('qid', None)
    #db = request.args.get('db', None)

    if not qid:
        qid = '4f2808554834a30ccc000001'

    #if not db:
    #    db = '5074589002e31023d4292d83'

    conn.register([model.Database])
    #admindb = conn["slideatlasv2"]
    #dbobj = admindb["databases"].find_one({"_id" : ObjectId(db)})
    qdb = conn['demo']

    colQuestion = qdb["questions"]
    question = colImage.find_one({'_id':ObjectId(qid)})
    
    myquestion = {}
    myquestion.images = {}
    myquestion.databases = question.imgdbs
    myquestion.correct = -1
    
    #for index, viewid in enumerate(question.viewids)
    #  myquestion.images.append(conn[question.viewdbs[index]]["images"].find_one({'_id':viewid}))

    return render_template('mydualviewer.html', question=myquestion)
