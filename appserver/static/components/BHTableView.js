require.config({
    paths: {
        "datatables.net": "../app/broken_hosts/components/lib/DataTables/DataTables-1.10.16/js/jquery.dataTables.min",
        datatables: "../app/broken_hosts/components/lib/DataTables/DataTables-1.10.16/js/jquery.dataTables",
        bootstrapDataTables: "../app/broken_hosts/components/lib/DataTables/DataTables-1.10.16/js/dataTables.bootstrap",
        rowreorders: "../app/broken_hosts/components/lib/DataTables/RowReorder-1.2.3/js/dataTables.rowReorder",
        selects: "../app/broken_hosts/components/lib/DataTables/Select-1.2.4/js/dataTables.select.min",
        clipboard : "../app/broken_hosts/components/lib/clipboard/clipboard.min",
        text: "../app/broken_hosts/components/lib/text",
        'BHTableTemplate' : '../app/broken_hosts/components/templates/bhTableTemplate.html',
         "modalModel" : '../app/broken_hosts/components/models/modalModel'

    },
    shim: {
        'bootstrapDataTables': {
            deps: ['datatables']
        }
    }
});

define([
	"underscore",
	"backbone",
    "jquery",
    "splunkjs/mvc",
    "datatables",
    "rowreorders",
    "selects",
    "clipboard",
    "text!BHTableTemplate",
    '../app/broken_hosts/components/ModalView',
    "modalModel",
    "splunkjs/mvc/searchmanager",
    "bootstrap.dropdown",
    ], function(_, Backbone, $, mvc, dataTable, rowReorder, selects, Clipboard,
                BHTableTemplate, ModalView, ModalModel, SearchManager) {

        var BHTableView = Backbone.View.extend({
    
            initialize: function(options) {
                this.options = options;
                this.options = _.extend({}, this.defaults, this.options);
                this.mode = options.mode;
                this.model = options.model;
                this.tokens = options.tokens;
				this.eventBus = this.options.eventBus;
				this.childComponents = [];
				this.sourcetypeDropdown = "";
                this.data_table = null;
                this.current_row = "";
                this.results = this.options.results;
                this.restored = this.options.restored; //restored from backup?
                this.updating = false;
                this.per_page = 10;
                this.modalModel = ModalModel;
                this.updateRow = mvc.Components.get("updateRow");
                this.addRow = mvc.Components.get("addRow");
                this.tokens = mvc.Components.get("submitted");
                //this.eventBus.on("row:update:done", this.getUpdatedData, this);
                this.eventBus.on("populated:kvstore", this.renderList, this);
                this.eventBus.on("row:edit", this.showEditModal, this);
                this.eventBus.on("row:update", this.runUpdateSearch, this); //triggered from modal view
                this.eventBus.on("row:new", this.runAddNewSearch, this); //triggered from modal view
                this.on("updating", this.updateStatus, this);
                this.searches = [];
                var sourcetypeInputSearch = new SearchManager({
                    id: "sourcetype-input-search",
                    search: "| metadata type=sourcetypes index=* | table sourcetype"
                });
                var hostInputSearch = new SearchManager({
                    id: "host-input-search",
                    search: "| metadata type=hosts index=* | table host"
                });
                var indexInputSearch = new SearchManager({
                    id: "index-input-search",
                    search: "| tstats count WHERE index=* by index"
                });

                this.searches.push(sourcetypeInputSearch);
                this.searches.push(hostInputSearch);
                this.searches.push(indexInputSearch);
                //_.bindAll(this, "changed");
            },

            events: {
                'click .edit' : 'editRow',
                'click .remove' : 'removeRow',
                'click .clipboard' : 'copyRow',
                'click .per-page' : 'pageCountChanged',
                'click #populateDefault' : 'populateTable',
                'click #addNewRow' : 'addNewRow'
            },

            updateStatus: function(updating) {
                var that = this;
                this.updating = updating;
                if(this.updating === true) {
                    that.data_table.rowReorder.disable();
                    $(".updating").fadeIn();
                    $("td").css({ "color" : "#7a7a7a"});
                } else {
                    that.data_table.rowReorder.enable();
                    $(".updating").fadeOut();
                    $("td").css({ "color" : "#000000"});
                }

            },

            editRow: function(e) {

                console.log("Edit row...");
                e.preventDefault();
                this.current_row = this.data_table.row( $(e.target).parents('tr') );
                var current_row_data = this.current_row.data();
                console.log("current row data: ", current_row_data);
                this.eventBus.trigger("row:edit", current_row_data);

            },

            addNewRow: function() {

                var that = this;

                this.unsetModal();

                this.modalModel.set({
                    _key: "",
                    comments: "",
                    contact: "",
                    host: "",
                    index: "",
                    lateSecs: "",
                    sourcetype: "",
                    suppressUntil: "",
                    mode: "New"
                });

                var modal = new ModalView({
                    model : that.modalModel,
                    eventBus : that.eventBus,
                    mode : 'New',
                    searches : that.searches,
                    tokens : that.tokens
                });

                this.childComponents.push(modal);

                modal.show();

            },

            showEditModal: function(row_data) {

                this.unsetModal();

                var that = this;
                console.log("Row data edit: ", row_data);

                this.modalModel.set({
                    _key: row_data[0],
                    comments: row_data[1],
                    contact: row_data[2],
                    host: row_data[3],
                    index: row_data[4],
                    sourcetype: row_data[5],
                    lateSecs: row_data[6],
                    suppressUntil: row_data[7],
                    mode: "Edit"
                });

                var modal = new ModalView({
                    model : that.modalModel,
                    eventBus : that.eventBus,
                    mode : 'Edit',
                    searches : that.searches,
                    tokens : that.tokens
                });

                this.childComponents.push(modal);

                modal.show();

            },

            runAddNewSearch: function(row_data) {

                this.trigger("updating", true);

                var that = this;

                //Run addRow search created in dashboard simple XML
                this.addRow.startSearch();

                this.addRow.on("search:done", function() {

                    var service = mvc.createService({ owner: "nobody" });
                    var auth = "";

                    //Get all updated KVStore data
                    service.get('/servicesNS/nobody/broken_hosts/storage/collections/data/expectedTime',
                        auth, function(err,res) {

                        if(err) {
                            return;
                        }

                        var cleaned_data = [];

                        function fix_key(key) {
                            return key.replace(/^_key/, "key"); }

                        _.each(res.data, function(row_obj, row_k) {
                            var row = _.object(
                                _.map(_.keys(row_obj), fix_key),
                                _.values(row_obj)
                            );

                            cleaned_data.push(row);

                        });

                        console.log("cleaned data: ", cleaned_data);
                        console.log("cleaned data last row ", cleaned_data[cleaned_data.length-1]);
                        var new_row_idx = cleaned_data.length-1;
                        var new_row_data = cleaned_data[cleaned_data.length-1];

                        //Add new row content
                        var new_row = that.data_table.row.add([
                            new_row_data["key"],
                            new_row_data["comments"],
                            new_row_data["contact"],
                            new_row_data["host"],
                            new_row_data["index"],
                            new_row_data["sourcetype"],
                            new_row_data["lateSecs"],
                            new_row_data["suppressUntil"],
                            "<a class=\"edit\" href=\"#\">Edit</a>",
                            "<a class=\"remove\" href=\"#\">Remove</a>",
                            "<a class=\"clipboard\" data-clipboard-target=\"#row-"+new_row_idx+"\" href=\"#\">Copy</a>"
                        ]).draw(false).node();

                        that.trigger("updating", false);
                        //that.processDataForUpdate();

                    });

                });

            },

            runUpdateSearch: function(row_data) {
                var that = this;

                that.trigger("updating", true);

                this.updateRow.startSearch();

                var temp = this.current_row.data();

                temp[1] = row_data["comments"];
                temp[2] = row_data["contact"];
                temp[3] = row_data["host"];
                temp[4] = row_data["index"];
                temp[5] = row_data["sourcetype"];
                temp[6] = row_data["lateSecs"];
                temp[7] = row_data["suppressUntil"];

                this.current_row.data(temp).invalidate();

                this.updateRow.on("search:done", function() {
                    that.trigger("updating", false);
                });

            },

            copyRow: function(e) {

                new Clipboard('.clipboard', {
                    text: function(trigger) {

                        var comments, contact, host, index, sourcetype, lateSecs, suppressUntil = "";

                        $(trigger).parents('tr').each(function(i, el) {

                            var td = $(this).find('td');
                            comments = td.eq(0).text();
                            contact = td.eq(1).text();
                            host = td.eq(2).text();
                            index = td.eq(3).text();
                            sourcetype = td.eq(4).text();
                            lateSecs = td.eq(5).text();
                            suppressUntil = td.eq(6).text();

                        });

                        var final_output = "Comments: " + comments + "\n" +
                            "Contact: " + contact + "\n" + "Host: " + host + "\n" + "Index: " + index + "\n" +
                            "Sourcetype: " + sourcetype + "\n" + "Late Seconds: " + lateSecs + "\n" +
                            "Suppress Until: " + suppressUntil;

                        return final_output;

                    }
                });

            },

            pageCountChanged: function(e) {

                var per_page = $(e.currentTarget).data('page-count');
                this.per_page = parseInt(per_page);

                this.reDraw(this.results);

            },

            removeRow: function(e) {

                this.trigger("updating", true);
                this.data_table.row($(e.currentTarget).parents('tr')).remove().draw(false);

                this.processDataForUpdate();

            },

            reDraw: function(data) {

                var that = this;
                this.results = data;

                setTimeout(function() {
                    that.renderList(false);
                }.bind(this), 100);

                return;
            },


            getUpdatedData: function() {

                var service = mvc.createService({ owner: "nobody" });
                var that = this;
                var auth = "";
                //var done = false;
                //var res = "";


                service.get('/servicesNS/nobody/broken_hosts/storage/collections/data/expectedTime', auth,
                    function(err,res) {

                    if(err) {
                        return;
                    }

                    var cleaned_data = [];

                    function fix_key(key) {
                        return key.replace(/^_key/, "key"); }

                    _.each(res.data, function(row_obj, row_k) {
                        var row = _.object(
                            _.map(_.keys(row_obj), fix_key),
                            _.values(row_obj)
                        );

                        row['Edit'] = 'Edit';
                        row['Remove'] = 'Remove';

                        cleaned_data.push(row);

                    });

                    that.reDraw(cleaned_data);

                });

            },


            renderList: function(retain_datatables_state) {

                var bh_template = $('#bhTable-template', this.$el).text();
                var that = this;

                if(this.results === null) {
                    return;
                }

                $("#bh-content", this.$el).html(_.template(bh_template, {
                    suppressions: this.results,
                    per_page: this.per_page,
                    restored: this.restored
                }));

                this.data_table = $('#bhTable', this.$el).DataTable( {
                    rowReorder: {
                        selector: 'td:first-child',
                    },
                    columnDefs: [
                        {
                            "targets" : [0],
                            "visible" : false
                        },
                        {
                            "targets" : [1],
                            "className" : "reorder"
                        }
                    ],
                    ordering: true,
                    "iDisplayLength" : this.per_page,
                    "bLengthChange" : false,
                    "searching" : true,
                    "bFilter" : false,
                    "bStateSave" : true,
                    "pagingType" : "simple_numbers",
                    "language" : { search: "" },
                    //"oLanguage": { "sSearch": "" },
                    "aLengthMenu" : [[5,10,15,-1], [5,10,15,"All"]],
                    //"ordering" : false,
                    "fnStateLoadParams": function (oSettings, oData) {
                        return retain_datatables_state;
                    }
                });

                $('div.dataTables_filter input').addClass('search-query');
                $('div.dataTables_filter input[type="search"]').attr('placeholder', 'Filter');

                this.data_table.on('row-reorder', function (e, details, changes) {

                    that.data_table.draw(false);
                    that.trigger("updating", true);


                    that.processDataForUpdate();

                });

            },

            populateTable: function() {

                var service = mvc.createService({ owner: "nobody" });
                var that = this;

                $("#populateDefault").text("Populating...");

                service.request(
                    "/servicesNS/nobody/broken_hosts/bhosts/bhosts_setup/setup",
                    "POST",
                    null,
                    null,
                    null,
                    {"Content-Type": "application/json"}, null)
                    .done(function(response) {

                        console.log("populated kvstore: ", response);
                        //that.results = null;

                        that.getUpdatedData();

                    });

            },

            processDataForUpdate: function() {

                var that = this;

                setTimeout(function() {
                    var headers_data = that.data_table.columns().header();
                    var updatedData = that.data_table.rows({order: 'applied'}).data();
                    var headers = [];
                    var mappedHeaders = [
                        {header: "Key", mapped: "_key"},
                        {header: "Comments", mapped: "comments"},
                        {header: "Contact", mapped: "contact"},
                        {header: "Host", mapped: "host"},
                        {header: "Index", mapped: "index"},
                        {header: "Sourcetype", mapped: "sourcetype"},
                        {header: "Late Seconds", mapped: "lateSecs"},
                        {header: "Suppress Until", mapped: "suppressUntil"}
                    ];
                    //var updatedData = that.data_table.columns().data(0);

                    _.each(headers_data, function (header, k) {

                        var header_val = header.innerText;

                        _.each(mappedHeaders, function (mapping, k) {

                            if (header_val === mapping['header']) {

                                var mapped_val = mapping["mapped"];

                                headers.push(mapped_val);

                            }

                        });

                    });

                    that.mapData(updatedData, headers);

                }, 1000);

            },


            mapData: function(updatedData, headers) {

                var results = [];

                _.each(updatedData, function(row, row_k) {

                   var row_arr = [];
                   var row_obj = {};

                   _.each(row, function(col, col_k) {

                       if(headers[col_k]) {

                           var header = headers[col_k];

                           row_obj[header] = col;

                       }

                   });

                   results.push(row_obj);

                });

                var data = JSON.stringify(results);

                console.log("Data to update: ", data);
                this.updateKVStore(data);

            },

            updateKVStore: function(data) {

                var that = this;
                var rand = Math.random();
                var service = mvc.createService({ owner: "nobody" });

                //Back it up
                var backupExpectedTime = new SearchManager({
                    id: "backupExpectedTime"+rand,
                    earliest_time: "-1m",
                    latest_time: "now",
                    preview: true,
                    cache: false,
                    search: "| inputlookup expectedTime | outputlookup expectedTime_tmp"
                });

                var emptyExpectedTime = new SearchManager({
                    id: "emptyExpectedTime"+rand,
                    earliest_time: "-1m",
                    latest_time: "now",
                    preview: true,
                    cache: false,
                    autostart: false,
                    search: "| outputlookup expectedTime"
                });

                //once backup is complete, empty out the kvstore
                backupExpectedTime.on("search:done", function() {
                    emptyExpectedTime.startSearch()
                });

                emptyExpectedTime.on("search:done", function() {
                    service.request(
                    "/servicesNS/nobody/broken_hosts/storage/collections/data/expectedTime/batch_save",
                    "POST",
                    null,
                    null,
                    data,
                    {"Content-Type": "application/json"}, null)
                    .done(function() {
                        console.log("KVStore updated!");
                        that.trigger("updating", false);
                        $('td').css({ 'color' : '#000' });
                    });
                });

            },

            render: function() {

                var that = this;

                var retain_datatables_state = (typeof retain_datatables_state === "undefined") ? false : true;

                this.$el.html(BHTableTemplate);

                this.renderList(retain_datatables_state);

                if(this.restored) {
                    setTimeout(function() {
                        $(".restored").fadeOut();
                        that.restored = false;
                    }, 4000);
                }

                return this;

            },

            unsetModal: function() {
                _.each(this.childComponents, function(c) {
                    c.unbind();
                    c.remove();
                });
            }

        });
        
        return BHTableView;

});