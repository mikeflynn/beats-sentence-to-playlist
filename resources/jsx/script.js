/** @jsx React.DOM */

var Sentence = React.createClass({
  getInitialState: function() {
    return {
      activities: [],
      genres: [],
      people: [],
      places: []
    };
  },
  componentDidMount: function() {
    var auth = getAuthCache();
    var params = {userid: auth.userid, token: auth.token};
    jQuery.getJSON('/api/options', params, function(resp) {
      if (this.isMounted()) {
        this.setState(resp);
      }
    }.bind(this));
  },
  render: function() {
    return (
      <div id="sentence">
        <span>i'm</span>
        <SentenceSelect part="places" options={this.state.places} />
        <span>and feel like</span>
        <SentenceSelect part="activities" options={this.state.activities} />
        <span>with</span>
        <SentenceSelect part="people" options={this.state.people} />
        <span>to</span>
        <SentenceSelect part="genres" options={this.state.genres} />
      </div>
    );
  }
});

var SentenceSelect = React.createClass({
  render: function() {
    var select_id = "sentence_" + this.props.part;
    var options = this.props.options.map(function(row, i) {
      return <option key={i} value={row.id}>{row.display}</option>;
    });

    return (
      <select id={select_id} className="form-control">
        {options}
      </select>
    );
  }
});

// OAuth Handlers

var getParam = function(name) {
  name = name.replace(/[\[]/,"\\\[").replace(/[\]]/,"\\\]");
  var regexS = "[\\?&]"+name+"=([^&#]*)";
  var regex = new RegExp( regexS );
  var results = regex.exec( window.location.href );
  if (results === null) {
    return null;
  } else {
    return results[1];
  }
};

var makeAuthRequest = function (e) {
  jQuery.getJSON('/api/init', function(resp) {
    if(!resp.key) { return false; }

    var authParams = {
      state: 'true',
      response_type: 'code',
      redirect_uri: getUri(),
      client_id: resp.key
    };

    window.location.href = "https://partner.api.beatsmusic.com/v1/oauth2/authorize?" + jQuery.param(authParams);
  });
};

var getUri = function() {
  return window.location.origin + window.location.pathname;
};

var handleResponse = function() {
  if(getParam('state') !== null) {
    var params = {code: getParam('code'), callback: getUri()};
    jQuery.post('/api/token', params, function(resp) {
      console.log(resp);
      if(window.localStorage) {
        if(resp.token) {
          resp.expires = Date.now() + 3600000;
          window.localStorage.setItem('auth', JSON.stringify(resp));
          dropOverlay();
        }
      }
    }, "json");
  }
};

var dropOverlay = function() {
  jQuery('#overlay-modal').modal('hide');
  startRender();
};

var hasAuth = function() {
  var auth = getAuthCache();
  if(auth.token && Date.now() < auth.expires) {
    return true;
  }

  return false;
};

var getAuthCache = function() {
  return JSON.parse(window.localStorage.getItem('auth'));
};

var startRender = function() {
  React.renderComponent(Sentence(), document.getElementById('main'));
  jQuery('#createBtn').click(function() {
    var auth = getAuthCache();
    var params = {
      userid: auth.userid,
      token: auth.token,
      placeid: jQuery('#sentence_places').val(),
      activityid: jQuery('#sentence_activities').val(),
      peopleid: jQuery('#sentence_people').val(),
      genreid: jQuery('#sentence_genres').val(),
      total: jQuery('#playlistCount').val()
    };

    var title = jQuery('#playlistName').val();
    if(title) { params.title = title; }

    jQuery.post('/api/save', params, function(resp) {
      if(resp.playlist) {
        jQuery('#new_playlist_name').text(resp.playlist);
        jQuery('#completeModal').modal();
      }
    }, "json");
  });
};

if(!Date.now) {
  Date.now = function() { return new Date().getTime(); };
}

jQuery(document).ready(function(){
  if(!hasAuth()) {
    jQuery('#overlay-modal').modal();
    jQuery('#authBtn').click(makeAuthRequest);
    handleResponse();
  } else {
    startRender();
  }
});