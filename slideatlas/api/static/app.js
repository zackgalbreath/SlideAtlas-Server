/**
 * @author dhanannjay.deo
 */
(function ($) {
    
    var databases = [ 
        {
            "_id" : "5074589002e31023d4292d83",
            "copyright" : "Copyright &copy; 2011-12, Charles Palmer, Beverly Faulkner-Jones and Su-jean Seo. All rights reserved.",
            "dbname" : "bev1",
            "host" : "slide-atlas.org",
            "label" : "Harvard Combined Dermatology Residency Training Program",
            "users" : [
                    {
                            "username" : "DX0",
                            "created_at" :  "2012-10-16T21:40:58.158Z",
                            "db" : "bev1",
                            "created_by" :  "507db8bf8af4a5e2a18d7081",
                            "host" : "slide-atlas.org",
                            "version" : 11,
                            "password" : "6QUF7T"
                    }
            ]
    },
    {
            "_id" : "507f34a902e31010bcdb1366",
            "copyright" : "Copyright &copy 2011-2012, BIDMC Pathology. All rights reserved",
            "dbname" : "bidmc1",
            "host" : "slide-atlas.org",
            "label" : "BIDMC Pathology",
            "users" : [
                    {
                            "username" : "6KI",
                            "created_at" :  "2012-10-17T22:49:35.450Z",
                            "db" : "bidmc1",
                            "created_by" :  "507db8bf8af4a5e2a18d7081",
                            "host" : "slide-atlas.org",
                            "version" : 11,
                            "password" : "1ITNJU"
                    }
            ]
    }, 
    {
            "_id" : "507f34a902e31010bcdb1367",
            "copyright" : "Copyright &copy 2012, Risa Kawai. All rights reserved.",
            "dbname" : "kawai1",
            "host" : "slide-atlas.org",
            "label" : "Risa Kawai",
            "users" : [
                    {
                            "username" : "O7T",
                            "created_at" :  "2012-10-17T22:49:56.882Z",
                            "db" : "kawai1",
                            "created_by" :  "507db8bf8af4a5e2a18d7081",
                            "host" : "slide-atlas.org",
                            "version" : 11,
                            "password" : "OOE3YZ"
                    }
            ]
    }
    ]
    // var books = [{title:"JS the good parts", author:"John Doe", releaseDate:"2012", keywords:"JavaScript Programming"},
    //     {title:"CS the better parts", author:"John Doe", releaseDate:"2012", keywords:"CoffeeScript Programming"},
    //     {title:"Scala for the impatient", author:"John Doe", releaseDate:"2012", keywords:"Scala Programming"},
    //     {title:"American Psyco", author:"Bret Easton Ellis", releaseDate:"2012", keywords:"Novel Splatter"},
    //     {title:"Eloquent JavaScript", author:"John Doe", releaseDate:"2012", keywords:"JavaScript Programming"}];

    var Database = Backbone.Model.extend({
        defaults:{
            dbname:"",
            host:"127.0.0.1:27017",
            users: [],
            copyright:'',
            label:'Untitled Database'
        }
    });

    var DBList  = Backbone.Collection.extend({
       model:Database
    });

    var DatabaseView = Backbone.View.extend({
        tagName:"div",
        className:"dbContainer",
        template:$("#dbTemplate").html(),

        render:function () {
            var tmpl = _.template(this.template); //tmpl is a function that takes a JSON object and returns html
            this.$el.html(tmpl(this.model.toJSON())); //this.el is what we defined in tagName. use $el to get access to jQuery html() function
            return this;
        }
    });

 var DBListView = Backbone.View.extend({
        el:$("#databases"),

        initialize:function(){
            this.collection = new DBList(databases);
            this.render();
        },

        render:function(){
            var that = this;
            _.each(this.collection.models, function(item){
                that.renderDB(item);
            }, this);
        },

        renderDB:function(item){
            var dbView = new DatabaseView({
                model:item
            });
            this.$el.append(dbView.render().el);
        }
    });

    var libraryView = new DBListView();

})(jQuery);