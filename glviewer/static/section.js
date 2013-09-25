//==============================================================================
// Section Object
function Section () {
  // Warping to align this section with previous / next.
  // This is only a matrix transformation.
  this.Matrix = mat4.create();
  mat4.identity(this.Matrix);
  // The list of caches is really just a list of images in the montage.
  this.Caches = [];
  // For debugging stitching.
  this.Markers = [];
  
  this.Bounds = [0,10000,0,10000];
}


Section.prototype.LoadRoots = function () {
  for (var cIdx = 0; cIdx < this.Caches.length; ++cIdx) {
    var cache = this.Caches[cIdx];
    if (cache) {
      cache.LoadRoots();
    }
  }
}


Section.prototype.FindImage = function (imageCollectionName) {
  for (var i = 0; i < this.Caches.length; ++i) {
    var cache = this.Caches[i];
    if (cache.ImageId == imageCollectionName) {
      return cache;
    }
  }
  return null;
}


// I do not like passing in the whole view.
// Could we get away with just passing the camera?
// No, we need the viewport too.
// Could the viewport be part of the camera?
Section.prototype.Draw = function (view) {
  if (GL) {
    var program = imageProgram;
    GL.useProgram(program);
    // Draw tiles.
    GL.viewport(view.Viewport[0], view.Viewport[1], 
                view.Viewport[2], view.Viewport[3]);
    GL.uniformMatrix4fv(program.pMatrixUniform, false, view.Camera.Matrix);
  } else {
    GC_save();

    //GC.strokeStyle="#FF0000";
    //GC.strokeRect(view.Viewport[0]+ 0.25*view.Viewport[2],
    //              view.Viewport[1]+ 0.25*view.Viewport[3],
    //              0.5*view.Viewport[2],0.5*view.Viewport[3]);

    // Map (-1->1, -1->1) to the viewport.
    //GC.transform(view.Viewport[2],0,0,view.Viewport[3],view.Viewport[0],view.Viewport[1]);
    GC_transform(0.5*view.Viewport[2], 0.0,
                 0.0, 0.5*view.Viewport[3], 
                 view.Viewport[0] + 0.5*view.Viewport[2],
                 view.Viewport[1] + 0.5*view.Viewport[3]);
        
    // The camera maps the world coordinate system to (-1->1, -1->1). 
    var h = 1.0 / view.Camera.Matrix[15];
    GC_transform(view.Camera.Matrix[0]*h, view.Camera.Matrix[1]*h, 
                 view.Camera.Matrix[4]*h, view.Camera.Matrix[5]*h,
                 view.Camera.Matrix[12]*h, view.Camera.Matrix[13]*h);
  }
  
  for (var i = 0; i < this.Caches.length; ++i) {
    var cache = this.Caches[i];
    // Select the tiles to render first.
    this.Tiles = cache.ChooseTiles(view, SLICE, view.Tiles);  

    // For the 2d viewer, the order the tiles are drawn is very important.
    // Low-resolution tiles have to be drawn first.  Make a new sorted array.
    // The problem is that unloaded tiles fall back to rendering parents.
    // Make  copy (although we could just destroy the "Tiles" array which is not really used again).
    var tiles = this.Tiles.slice(0); 
    var loadedTiles = [];
    var j = 0;
    while (j < tiles.length) { // We add tiles in the loop so we need a while.
      if (tiles[j].LoadState == 3) {
        loadedTiles.push(tiles[j]);
      } else if (tiles[j].parent) { // Queue up the parent.
        // Note: Parents might be added multiple times by different siblings.
        tiles.push_back(tiles[j].parent);
      }
      ++j;
    }
    
    // Reverse order to render low res tiles first.
    for (var j = tiles.length-1; j >= 0; --j) {
      tiles[j].Draw(program);
    }
  }

  if (GC) {
    GC_restore();
  }
}


Section.prototype.LoadTilesInView = function (view) {
  for (var i = 0; i < this.Caches.length; ++i) {
    var cache = this.Caches[i];
    // Select the tiles to render first.
    // This also adds the tiles returned to the loading queue.
    this.Tiles = cache.ChooseTiles(view, SLICE, view.Tiles);  
  }
}

// The above will load the first ancestor not loaded and will stop.
// I need to pre load the actual high res tiles for connectome.
Section.prototype.LoadTilesInView2 = function (view) {
  for (var cIdx = 0; cIdx < this.Caches.length; ++cIdx) {
    var cache = this.Caches[cIdx];
    // Select the tiles to load (loading is a byproduct).
    var tiles = cache.ChooseTiles(view, SLICE);
    for (var i = 0; i < tiles.length; ++i) {
      tiles[i].LoadState = 1;
      // Add the tile at the front of the queue.
      LOAD_QUEUE.push(tiles[i]);
    }
  }
  LoadQueueUpdate();
}




// This load tiles in the view like draw but does not render them.
// I want to preload tiles in the next section.
Section.prototype.LoadTilesInView = function (view) {
  for (var cIdx = 0; cIdx < this.Caches.length; ++cIdx) {
    var cache = this.Caches[cIdx];
    // Select the tiles to load (loading is a byproduct).
    var tiles = cache.ChooseTiles(view, SLICE);
  }
}




