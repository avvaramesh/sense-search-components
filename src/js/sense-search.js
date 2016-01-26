include "./input.js"
include "./results.js"

var SenseSearch = (function(){

  include "./connection.js"
  include "./socket-session.js"
  include "./subscription.js"
  include "./exchange.js"

  function SenseSearch(){
    this.ready = new Subscription();
    this.searchResults = new Subscription();
    this.suggestResults = new Subscription();
    this.cleared = new Subscription();
  }

  SenseSearch.prototype = Object.create(Object.prototype, {
    init:{
      value: function(){
        //see if there are any elements that need rendering
        var inputs = document.getElementsByTagName('sense-search-input');
        for (var i = 0; i < inputs.length;) {
            var id = inputs[i].id;
            var input = new SenseSearchInput(id);
            this.inputs[id] = input.object;
        }
        var results = document.getElementsByTagName('sense-search-results');
        for (var i = 0; i < results.length;) {
            var id = results[i].id;
            var result = new SenseSearchResult(id);
            this.results[id] = result.object;
        }
      }
    },
    inputs: {
      writable: true,
      value: {}
    },
    results:{
      writable: true,
      value: {}
    },
    pendingSearch:{
      writable: true,
      value: null
    },
    pendingSuggest:{
      writable: true,
      value: null
    },
    appHandle: {
      writable: true,
      value: null
    },
    exchange:{
      writable: true,
      value: null
    },
    connect:{
      value: function(config, callbackFn){
        var that = this;
        this.exchange = new Exchange(config, "Native", function(response){
          if(response.result && response.result.qReturn){
              that.appHandle = response.result.qReturn.qHandle;
              that.ready.subscribe(callbackFn);
              that.ready.deliver();
          }
        });
      }
    },
    connectWithQSocks: {
      value: function(app){
        this.appHandle = app.handle;
        this.exchange = new Exchange(app.connection, "QSocks");
        this.ready.deliver();
      }
    },
    connectWithCapabilityAPI: {
      value:  function(app){
        this.appHandle = app.global.session.connectedAppHandle;
        this.exchange = new Exchange(app.global.session, "CapabilityAPI");
        this.ready.deliver();

        console.log(app);
      }
    },
    readOptions:{
      value: function(options){
        for (var o in options){
          this[0] = options[o];
        }
      }
    },
    ready:{
      writable: true,
      value: null
    },
    newResultsDefinition:{
      value: function(options, channel, callbackFn){
        var result = new Result(options);
        this.results.push(result);
      }
    },
    search: {
      value: function(searchText, searchFields, context){
        var that = this;
        this.pendingSearch = this.exchange.seqId+1;
        this.terms = searchText.split(" ");
        this.exchange.ask(this.appHandle, "SearchAssociations", [{qContext: context || this.context || "LockedFieldsOnly", qSearchFields: searchFields}, this.terms, {qOffset: 0, qCount: 5, qMaxNbrFieldMatches: 5}], function(response){
          if(response.id == that.pendingSearch){
            if(searchText== "" || response.result.qResults.qTotalSearchResults>0){
              that.exchange.ask(that.appHandle, "SelectAssociations", [{qContext: context || that.context || "LockedFieldsOnly", qSearchFields: searchFields}, that.terms, 0], function(response){
                that.searchResults.deliver(response.change);
              });
            }
            else{
              //we send a no results instruction
              
            }
          }
        });
      }
    },
    suggest:{
      value: function(searchText, suggestFields, context){
        var that = this;
        that.pendingSuggest = this.exchange.seqId+1;
        this.exchange.ask(this.appHandle, "SearchSuggest", [{qContext: context || this.context || "LockedFieldsOnly", qSearchFields: suggestFields}, searchText.split(" ")], function(response){
          if(response.id == that.pendingSuggest){
            that.suggestResults.deliver(response.result.qResult);
          }
        });
      }
    },
    clear:{
      value: function(){
        this.terms = null;
        this.cleared.deliver();
      }
    },
    searchResults:{
      writable: true,
      value: null
    },
    suggestResults:{
      writable: true,
      value: null
    }
  });

  return SenseSearch;
}());

var senseSearch = new SenseSearch();
senseSearch.init();