var CONNECTOME_CURRENT_SECTION_INDEX = -1;
var CONNECTOME_SECTION_IDS;
var CONNECTOME_SECTIONS = [];
var CONNECTOME_SECTION_META_DATA;
var CONNECTOME_SECTION_LABEL;

var CONNECTOME_POPUP_MENU_BUTTON;
var CONNECTOME_POPUP_MENU;



function InitConnectome () {

  CONNECTOME_SECTION_LABEL =
    $('<div>')
      .appendTo('body').attr({'id':'sectionLabel'})
      .css({'position': 'absolute',
            'left': '45px',
            'bottom': '30px',
            'border-radius': '8px',
            'font-size': '18px',
            'background': '#ffffff',
            'z-index': '2'});

  CONNECTOME_POPUP_MENU_BUTTON = $('<img>')
    .appendTo('body')
    .css({
      'position': 'absolute',
      'height': '20px',
      'width': '20x',
      'left' : '20px',
      'bottom' : '32px',
      'z-index': '2'})
    .attr('src',"static/images/plus.jpg")
    .mouseenter(function() {CONNECTOME_POPUP_MENU.fadeIn(); })
    .click(function(){ShowCorrelationsCallback();});

  // For less used buttons that appear when mouse is over the pulldown button.
  // I would like to make a dynamic bar that puts extra buttons into the pulldown as it resizes.
  CONNECTOME_POPUP_MENU = $('<div>').attr({'id':'popup'})
    .appendTo('body')
    .css({'position': 'absolute',
         'left': '20px',
         'bottom': '32px',
         'z-index': '2',
         'background-color': 'white',
         'padding': '5px',
         'border-radius': '8px',
         'border-style': 'solid',
         'border-width':'1px'})
    .hide()
    .mouseleave(function(){
      var self = $(this),
      timeoutId = setTimeout(function(){CONNECTOME_POPUP_MENU.fadeOut();}, 650);
      //set the timeoutId, allowing us to clear this trigger if the mouse comes back over
      self.data('timeoutId', timeoutId);  })
    .mouseenter(function(){
      clearTimeout($(this).data('timeoutId')); });                       

  var removeButton = $('<button>')
    .appendTo(CONNECTOME_POPUP_MENU)
    .text("Remove Section")
    .css({'color' : '#278BFF', 'width':'100%','font-size': '18px'})
    .click( RemoveSectionCallback  );

  var loadButton = $('<button>')
    .appendTo(CONNECTOME_POPUP_MENU)
    .text("Load Neighborhood")
    .css({'color' : '#278BFF', 'width':'100%','font-size': '18px'})
    .click( LoadNeighborhoodCallback  );

  var showMeshButton = $('<button>')
    .appendTo(CONNECTOME_POPUP_MENU)
    .text("Show Mesh")
    .css({'color' : '#278BFF', 'width':'100%','font-size': '18px'})
    .click( ShowMeshCallback  );
    
  var showCorrelationsButton = $('<button>')
    .appendTo(CONNECTOME_POPUP_MENU)
    .text("Show Correlations")
    .css({'color' : '#278BFF', 'width':'100%','font-size': '18px'})
    .click( ShowCorrelationsCallback  );
    
  $.ajax({
    type: "get",
    url: "/getsections",
    data: {"db"  : DATABASE_NAME,
           "col" : COLLECTION_NAME,
           "type": "Section"},
    success: function(data,status) { ConnectomeLoadSectionIds(data);},
    error: function() { alert( "AJAX - error()" ); },
    });  
}


function ConnectomeAdvance(dz) {
  var idx = CONNECTOME_CURRENT_SECTION_INDEX + dz;
  if (idx < 0) { idx = 0; }
  if (idx >= CONNECTOME_SECTION_IDS.length) {
    idx = CONNECTOME_SECTION_IDS.length - 1;
  }
  ConnectomeSetCurrentSectionIndex(idx);
}


function ConnectomeLoadSectionIds (data) {
  CONNECTOME_SECTION_IDS = data.sections;
  // Look at cookies to find out what section was being viewed
  var wafer = getCookie("wafer");
  var section = getCookie("section");
  if (wafer && section) {
    section = parseInt(section);
    for (var idx = 0; idx < CONNECTOME_SECTION_IDS.length; ++idx) {
      var info = CONNECTOME_SECTION_IDS[idx];
      if (info.waferName == wafer && info.section == section) {
        ConnectomeSetCurrentSectionIndex(idx);
        return;
      }
    }
  }
  ConnectomeSetCurrentSectionIndex(0);
}



function ConnectomeSetCurrentSectionIndex (sectionIndex) {
  if (CONNECTOME_CURRENT_SECTION_INDEX == sectionIndex) {
    return;
  }
  CONNECTOME_CURRENT_SECTION_INDEX = sectionIndex;

  var info = CONNECTOME_SECTION_IDS[sectionIndex];
  CONNECTOME_SECTION_LABEL.text(info.waferName + " : " + info.section);
  setCookie("wafer",info.waferName, 30);
  setCookie("section",info.section.toFixed(), 30);

  var section = CONNECTOME_SECTIONS[sectionIndex];
  if (section) {
    // Load the section
    VIEWER1.SetSection(section);
    VIEWER1.ShapeList = section.Markers;
    eventuallyRender();
    return;
  }

  section = new Section();
  section.Index = sectionIndex; // for debugging
  CONNECTOME_SECTIONS[sectionIndex] = section;
  
  var sectionId = CONNECTOME_SECTION_IDS[sectionIndex]._id;
  $.ajax({
    type: "get",
    url: "/getsections",
    data: {"db"  : DATABASE_NAME,
           "col" : COLLECTION_NAME,
           "id"  : sectionId,
           "idx" : sectionIndex,
           "type": "Section"},
    success: function(data,status) { ConnectomeLoadSection(data, true);},
    error: function() { alert( "AJAX - error()" ); },
    });  
}




// Mesh from loop data.
function ConnectomeCreateMeshWarp (imageData, worldPoints) {
  var centerPt = new Object();
  centerPt.ImagePt = imageData.center.pixelLocation;
  centerPt.WorldPt = worldPoints[imageData.center.worldPointId].coordinates;
  // Create the points array.
  var points = [centerPt];
  for (var j = 0; j < imageData.loop.length; ++j) {
    var loopPt = new Object();
    loopPt.ImagePt = imageData.loop[j].pixelLocation;
    loopPt.WorldPt = worldPoints[imageData.loop[j].worldPointId].coordinates;
    points.push(loopPt);
  }
  // Create the triangle array.
  var triangles = [];
  for (var j = 2; j < points.length; ++j) {
    triangles.push([0, j-1, j]);
  }
  // Special case: last triangle.
  triangles.push([0, points.length-1, 1]);

  return new meshWarp(points, triangles);
}


function ConnectomeCreateLoopWarp (imageData, worldPoints) {
  var loop = [];
  for (var j = 0; j < imageData.loop.length; ++j) {
    var loopPt = new Object();
    loopPt.ImagePt = imageData.loop[j].pixelLocation;
    loopPt.WorldPt = worldPoints[imageData.loop[j].worldPointId].coordinates;
    loop.push(loopPt);
  }
  var centerPt = new Object();
  centerPt.ImagePt = imageData.center.pixelLocation;
  centerPt.WorldPt = worldPoints[imageData.center.worldPointId].coordinates;
  return new LoopWarp(loop, centerPt);
}


//
function ConnectomeLoadSection (data, showFlag) {
  var section = new Section();

  // for debugging
  CONNECTOME_SECTION_META_DATA = data;
  
  section.Bounds = data.bounds;
  var worldPoints = data.worldPoints;

  for (var i = 0; i < data.images.length; ++i) {
    var imageData = data.images[i];
    // TODO: Take bounds out of cache and keep it in section.
    // Or make cache have bounds of only its image (if this is useful).
    var cache = new Cache(data.imageDatabaseName, imageData.collectionName, 8, data.bounds);
    cache.Source = "/tile?db="+data.imageDatabaseName+"&img="+imageData.collectionName+"&name=";
    //var warp = ConnectomeCreateLoopWarp(imageData, worldPoints);
    var warp = ConnectomeCreateMeshWarp(imageData, worldPoints);
    cache.Warp = warp;
    section.Caches.push(cache);
  }
  
  // index passed to server and returned.
  // Better solution would be to use a section.method as the ajax callback.
  CONNECTOME_SECTIONS[data.index] = section;

  if (showFlag) {
    // Skip roots for pre loading
    section.LoadRoots();
    // Load the section
    VIEWER1.SetSection(section);
    // The marker array is empty here.
    VIEWER1.ShapeList = section.Markers;
    eventuallyRender();
  } else {
    // Loading in the background.
    // Load the tiles for the current view but do not show them.
    section.LoadTilesInView2(VIEWER1.MainView);
  }
}

// Load 100 sections after the current section.
// Load for the current view.

// It would be nice to have a progress bar.
function LoadNeighborhoodCallback() {
  CONNECTOME_POPUP_MENU.hide();  

  InitProgressBar();

  var endIdx = CONNECTOME_CURRENT_SECTION_INDEX + 10;
  if (endIdx >= CONNECTOME_SECTION_IDS.length) {
    endIdx = CONNECTOME_SECTION_IDS.length - 1;
  }

  // Trouble hanging. Lets try to slow dow the requests.
  CONNECTOME_SECTION_TO_LOAD = endIdx;
  LoadNextNeighborSection();
}



function LoadNextNeighborSection() {
  var i = CONNECTOME_SECTION_TO_LOAD;
  $.ajax({
    type: "get",
    url: "/getsections",
    data: {"db"  : DATABASE_NAME,
           "col" : COLLECTION_NAME,
           "id"  : CONNECTOME_SECTION_IDS[i]._id,
           "idx" : i,
           "type": "Section"},
        success: function(data,status) { ConnectomeLoadSection(data, false);},
        error: function() { alert( "AJAX - error()" ); },
      });  

  --CONNECTOME_SECTION_TO_LOAD;
  if (CONNECTOME_SECTION_TO_LOAD > CONNECTOME_CURRENT_SECTION_INDEX) {
      setTimeout(function(){LoadNextNeighborSection();}, 250);
  } else {
    // Reverse order so the proximal sections get loaded first.
    var endIdx = CONNECTOME_CURRENT_SECTION_INDEX + 10;
    if (endIdx >= CONNECTOME_SECTION_IDS.length) {
      endIdx = CONNECTOME_SECTION_IDS.length - 1;
    }
    for (var i = endIdx; i > CONNECTOME_CURRENT_SECTION_INDEX; --i) {
      section = CONNECTOME_SECTIONS[i];
      if (section) {
        section.LoadTilesInView(VIEWER1.MainView);
      }
    }
  }
}


function RemoveSectionCallback() {
  var info = CONNECTOME_SECTION_IDS[CONNECTOME_CURRENT_SECTION_INDEX];
  $.ajax({
    type: "get",
    url: "/removeobject",
    data: {"db"    : DATABASE_NAME,
           "col"   : COLLECTION_NAME,
           "id"    : info._id},
    success: function(data,status) { ConnectomeAdvance(1);},
    error: function() { alert( "AJAX - error()" ); },
    });  
}


function ShowCorrelationsCallback() {
  CONNECTOME_POPUP_MENU.hide();
  var sectionIndex = CONNECTOME_CURRENT_SECTION_INDEX;
  var section = CONNECTOME_SECTIONS[sectionIndex];
  if (section.Markers.length > 0) {
    return;
  }

  var info = CONNECTOME_SECTION_IDS[sectionIndex];
  $.ajax({
    type: "get",
    url: "/getcorrelations",
    data: {"db"    : DATABASE_NAME,
           "col"   : COLLECTION_NAME,
           "wafer" : info.waferName,
           "sect"  : info.section},
    success: function(data,status) { ConnectomeLoadCorrelations(data);},
    error: function() { alert( "AJAX - error()" ); },
    });  
}





  
function ConnectomeLoadCorrelations(data) {
  var sectionIndex = CONNECTOME_CURRENT_SECTION_INDEX;
  var section = CONNECTOME_SECTIONS[sectionIndex];
  // Mark correlations for debugging.
  for (var i = 0; i < data.CorrelationArray0.length; ++i) {
    var point = data.CorrelationArray0[i].point0;
    // Find the image.  We need to convert the image coordinate to a world coordinate.
    var source = section.FindImage(point.imageCollectionName); 
    if (source) {
      addMarkerToSection(section, source.ImageToWorld(point.imageCoordinates), [1,0,0]);
    }
  }
  for (var i = 0; i < data.CorrelationArray1.length; ++i) {
    var point = data.CorrelationArray1[i].point1;
    // Find the image.  We need to convert the image coordinate to a world coordinate.
    var source = section.FindImage(point.imageCollectionName); 
    if (source) {
      addMarkerToSection(section, source.ImageToWorld(point.imageCoordinates), [0,1,1]);
    }
  }
  VIEWER1.ShapeList = section.Markers;
  VIEWER1.AnnotationVisibility = true;
  eventuallyRender();
}


function addMarkerToSection(section, worldPt, fillColor) {
  var mark = new CrossHairs();
  mark.LineWidth = 0;
  mark.Length = 20;
  mark.FillColor = fillColor;
  mark.OutlineColor = [1,1,1];
  mark.Origin = worldPt;
  section.Markers.push(mark);
}


// For debugging the mesh interpolation.
function ShowMeshCallback() {
  var section = CONNECTOME_SECTIONS[CONNECTOME_CURRENT_SECTION_INDEX];  
  for (var i = 0; i < section.Caches.length; ++i) {
    var cache = section.Caches[i];
    var shape = new Mesh();
    shape.LineWidth = 0;
    shape.OutlineColor = [1,0,0];
    shape.FixedSize = false;
    shape.WireFrame = true;
    for (var j = 0; j < cache.Warp.Points.length; ++j) {
      shape.Points.push(cache.Warp.Points[j].WorldPt);  
    }
    shape.Triangles = cache.Warp.Triangles;
    shape.UpdateBuffers();
    VIEWER1.ShapeList.push(shape);
  }

  VIEWER1.AnnotationVisibility = true;
  eventuallyRender();
}
