// This "widget" implements undo and redo as well as saving states in the database for a recording of a session.
// I save the recording state as a cookie so that the user can change slides or even sessions.
// I am going to have a separate recording collection.
// Each recording will be a single object.
// They will be tagged with start time, end time, user ID and a name (autogenerated or entered by user).


// NOTES:
//I will have to think about this ...
//save state vs. save delta state.
//State is simple .... Supports undo better .... Start with this.

// Maybe students can link to the instructor recording session.  The could add notes which are added to the recording.

// It might be nice to know where the mouse is pointing at all times.  We need a pointing tool. That is alot of events though.  LATER....

// Design issue:
// Should I save the state at the end of a move or the begining?  I chose end.  Although begining is easier,
// I like just poping the last state off the TIME_LINE and pushing to the REDO_STACK


//------------------------------------------------------------------------------
// Records are now being used for notes.  Since page record may contain 
// information about current note, I am using ViewerRecord as a shared object.

function ViewerRecord () {
  this.Database = "";
  this.Image = ""; // The image collection
  this.NumberOfLevels = 0;
}

// Bookmark is legacy schema
ViewerRecord.prototype.LoadBookmark = function(data) {
  // Hack.  I should probably get the source from data.img
  // However, this would require a post to get info.
  // Since booksmarks are slated to be depreciated,
  // I will just hack this. (copy from viewer).
  var cache = VIEWER1.GetCache();    
  this.Database = cache.DatabaseId;
  this.Image = cache.ImageId;
  this.NumberOfLevels = cache.NumberOfLevels;
  
  var cameraRecord = {};
  cameraRecord.FocalPoint = data.center;
  cameraRecord.Height = 900 << data.zoom;
  cameraRecord.Roll = data.rotation;
  this.Camera = cameraRecord;

  // I cannot use a temporary widget to get a serialization because the constructor
  // adds the widget to the viewer.  I hate complext constructors!
  // Hack the serialization too.
  var obj = {};
  obj.type = "text";

  obj.color = ConvertColor(data.annotation.color);
  obj.size = 30;
  obj.position = data.annotation.points[0];
  obj.offset = [data.annotation.points[1][0]-obj.position[0], 
                data.annotation.points[1][1]-obj.position[1]];
  // Try to convert from world to pixels
  obj.offset[0] = obj.offset[0] * 900 / cameraRecord.Height;
  obj.offset[1] = obj.offset[1] * 900 / cameraRecord.Height;

  obj.string = data.title;
  obj.anchorVisibility = true;
  this.Annotations = [obj];
}

// view args format. Get rid of this asap.
ViewerRecord.prototype.LoadRootViewer = function(data) {
  // Hack. data is in args  but ....
  var cache = new Cache(data.db, 
                        data.image, 
                        data.levels);

  this.Database = data.db;
  this.Image = data.image;
  this.NumberOfLevels = data.levels;

  var cameraRecord = {};
  cameraRecord.FocalPoint = data.center;
  cameraRecord.Height = data.viewHeight;
  cameraRecord.Roll = data.rotation;
  this.Camera = cameraRecord;
  this.Annotations = [];
}


ViewerRecord.prototype.CopyViewer = function (viewer) {
  var cache = viewer.GetCache();
  if ( ! cache) { 
    this.Database = "";
    this.Image = "";
    this.NumberOfLevels = 0;
    this.Camera = null;
    this.AnnotationVisibility = ANNOTATION_OFF;
    this.Annotations = [];
    return;
  }
    
  this.Database = cache.DatabaseId;
  this.Image = cache.ImageId;
  // I could get this from the image / collection.
  this.NumberOfLevels = cache.NumberOfLevels;

  var cam = viewer.GetCamera();
  var cameraRecord = {};
  cameraRecord.FocalPoint = cam.GetFocalPoint();
  cameraRecord.Height = cam.GetHeight();
  cameraRecord.Roll = cam.GetRotation();
  this.Camera = cameraRecord;
  
  this.AnnotationVisibility = viewer.GetAnnotationVisibility();
  if (this.AnnotationVisibility) {
    this.Annotations = [];
    for (var i = 0; i < viewer.WidgetList.length; ++i) {
      this.Annotations.push(viewer.WidgetList[i].Serialize());
    }
  }
}

ViewerRecord.prototype.Apply = function (viewer) {
  // If a widget is active, then just inactivate it.
  // It would be nice to undo pencil strokes in the middle, but this feature will have to wait.
  if (viewer.ActiveWidget) {
    // Hackish way to deactivate.
    viewer.ActiveWidget.SetActive(false);  
  }

  var cache = viewer.GetCache();
  if ( ! cache || this.Image != cache.ImageId) {
    var newCache = new Cache(this.Database, 
                             this.Image, 
                             this.NumberOfLevels);
    viewer.SetCache(newCache);
  }

  if (this.Camera != undefined) {
    var cameraRecord = this.Camera;
    viewer.SetCamera(cameraRecord.FocalPoint,
                     cameraRecord.Roll,
                     cameraRecord.Height);
  }
  
  if (this.AnnotationVisibility != undefined) {
    viewer.AnnotationWidget.SetVisibility(this.AnnotationVisibility);
  }
  if (this.Annotations != undefined) {
    // For now lets just do the easy thing and recreate all the annotations.
    viewer.WidgetList = [];
    viewer.ShapeList = [];
    for (var i = 0; i < this.Annotations.length; ++i) {
      viewer.LoadWidget(this.Annotations[i]);
    }
  }
}






// Pointer to 
var TIME_LINE = [];
var REDO_STACK = [];

var RECORDING = false;
var RECORDING_NAME;

var RECORDING_BUTTON;
var UNDO_BUTTON;
var REDO_BUTTON;

function InitRecorderWidget() {

  // The recording button indicates that recording is in 
  // progress and also acts to stop recording.
  RECORD_BUTTON = $('<img>').appendTo('body')
    .css({
      'opacity': '0.5',
      'position': 'absolute',
      'height': '20px',
      'bottom' : '120px',
      'right' : '20px',
      'z-index': '1'})
    .attr('src','webgl-viewer/static/stopRecording2.png')
    .hide()
    .click(RecordingStop);


  // Optional buttons.  Exposed for testing.
  // Undo (control z) and redo (control y) keys work,
  UNDO_BUTTON = $('<img>').appendTo('body')
    .css({
      'opacity': '0.5',
      'position': 'absolute',
      'height': '30px',
      'bottom' : '5px',
      'right' : '100px',
      'z-index': '1'})
    .attr('src','webgl-viewer/static/undo.png')
    .hide()
    .click(function(){alert("undo");});
  REDO_BUTTON = $('<img>').appendTo('body').css({
      'opacity': '0.5',
      'position': 'absolute',
      'height': '30px',
      'bottom' : '5px',
      'right' : '70px',
      'z-index': '1'})
    .attr('src','webgl-viewer/static/redo.png')
    .hide()
    .click(function(){alert("REDO");});

  RECORDING_NAME = getCookie("SlideAtlasRecording");
  if (RECORDING_NAME != undefined && RECORDING_NAME != "false") {
    RECORDING = true;
    RecordingUpdateGUI();
  }

  // We have to start with one state (since we are recording states at the end of a move).
  RecordState();
}

// Should we name a recording?
function RecordingUpdateGUI() {
  if (RECORDING) {
    START_RECORDING_MENU_ITEM.hide();
    RECORD_BUTTON.show();
  } else {
    START_RECORDING_MENU_ITEM.show();
    RECORD_BUTTON.hide();
  }
}

// Should we name a recording?
function RecordingStart() {
  if (RECORDING) { return; }
  RECORDING = true;
  // Generate a recording name as a placeholder.
  // User should be prompted for a name when recording stops.
  var d = new Date();
  RECORDING_NAME = "Bev" + d.getTime();
  setCookie("SlideAtlasRecording",RECORDING_NAME,1);
  RecordingUpdateGUI();
  // Create a new recording object in the database.
  RecordState();
}

function RecordingStop() {
  if ( ! RECORDING) { return; }
  RECORDING = false;
  setCookie("SlideAtlasRecording","false",1);
  RecordingUpdateGUI();
  
  // Prompt for a name and if the user want to keep the recording.
}

function NewPageRecord() {
  stateRecord = {};
  stateRecord.Viewers = [];
  var viewerRecord = new ViewerRecord();
  viewerRecord.CopyViewer(VIEWER1);
  stateRecord.Viewers.push(viewerRecord);
  if (DUAL_VIEW) {
    viewerRecord = new ViewerRecord();
    viewerRecord.CopyViewer(VIEWER2);
    stateRecord.Viewers.push(viewerRecord);
  }
  // Note state? Which note is current.
  // Placeholder. Notes are not ready yet.
  
  return stateRecord;
}



// Create a snapshot of the current state and push it on  the TIME_LINE stack.
function RecordState() {
  // Redo is an option after undo, until we save a new state.
  REDO_STACK = [];

  var pageRecord = NewPageRecord();
  var d = new Date();
  pageRecord.Time = d.getTime();
  //pageRecord.User = "bev"; // Place holder until I figure out user ids.
  TIME_LINE.push(pageRecord);
  
  if (RECORDING) {
    $.ajax({
      type: "post",
      url: "/webgl-viewer/record-save",
      data: {"record": JSON.stringify( pageRecord ),
             "name"  : RECORDING_NAME,
             "db"    : SESSION_DB,
             "date"  : d.getTime()},
      success: function(data,status){
         //alert(data + "\nStatus: " + status);
         },
      error: function() { alert( "AJAX - error()" ); },
      });
  }
}


// Move the state back in time.
function UndoState() {
  if (TIME_LINE.length > 1) {
    // We need at least 2 states to undo.  The last state gets removed,
    // the second to last get applied.
    var record = TIME_LINE.pop();
    REDO_STACK.push(record);

    // Get the new end state
    record = TIME_LINE[TIME_LINE.length-1];
    // Now change the page to the state at the end of the timeline.
    SetNumberOfViews(record.Viewers.length);
    record.Viewers[0].Apply(VIEWER1);
    if (record.Viewers.length > 1) {
      record.Viewers[1].Apply(VIEWER2);
    }
  }
}

// Move the state forward in time.
function RedoState() {
  if (REDO_STACK.length == 0) {
    return;
  }
  var record = REDO_STACK.pop();
  TIME_LINE.push(record);

  // Now change the page to the state at the end of the timeline.
  SetNumberOfViews(record.Viewers.length);
  record.Viewers[0].Apply(VIEWER1);
  if (record.Viewers.length > 1) {
    record.Viewers[1].Apply(VIEWER2);
  }
}



