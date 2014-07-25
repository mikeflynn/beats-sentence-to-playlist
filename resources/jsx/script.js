/** @jsx React.DOM */

var Playlists = React.createClass({
  getInitialState: function() {
    return {list: []};
  },
  componentDidMount: function() {
    var auth = getAuthCache();
    var params = {userid: auth.userid, token: auth.token};
    toggleLoading();
    jQuery.getJSON('/api/playlist/list', params, function(resp) {
      if (this.isMounted()) {
        this.setState({list: resp});
        toggleLoading();
      }
    }.bind(this));
  },
  removePlaylist: function(pid) {
    if(confirm('Are you sure you want to delete this playlist? It can not be undone.')) {
      jQuery('li#'+pid).css({opacity: '.25'});

      var $this = this;
      var auth = getAuthCache();
      var params = {playlistid: pid, token: auth.token};
      jQuery.post('/api/playlist/delete', params, function(resp) {
        if(resp.result) {
          var list = $this.state.list.filter(function(e) {
            return (e.id != pid);
          });

          $this.setState({list: list});
        }

        jQuery('li').css({opacity: '1'});
      });
    }
  },
  render: function() {
    var $this = this;
    var playlists = this.state.list.map(function(row, i) {
      return <PlaylistItem key={i} data={row} onClick={$this.removePlaylist} />
    });

    return (
      <ul id="playlists" className="list-group">
        {playlists}
      </ul>
    );
  }
});

var PlaylistItem = React.createClass({
  render: function() {
    var desc = '';
    if(this.props.data.description != '') {
      desc = '/ ' + this.props.data.description;
    }

    var date = new Date(this.props.data.updated_at * 1000);
    var updated_on = (date.getMonth() + 1) + '/' + date.getDate() + '/' + (date.getYear() + 1900) ;

    return (
      <li className="list-group-item" id={this.props.data.id}>
        <button type="button" className="delPlaylist btn btn-default" onClick={this.props.onClick.bind(this, this.props.data.id)}>
          <span className="glyphicon glyphicon-trash"></span>
        </button>
        {this.props.data.name} <span className="desc">{desc}</span>
        <i>{this.props.data.total_tracks} tracks and last updated on {updated_on}.</i>
      </li>
    )
  }
});

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
    toggleLoading();
    var params = {code: getParam('code'), callback: getUri()};
    jQuery.post('/api/token', params, function(resp) {
      if(window.localStorage) {
        if(resp.token) {
          resp.expires = Date.now() + 3600000;
          window.localStorage.setItem('auth', JSON.stringify(resp));

          if(window.history) {
            history.pushState({}, "Create", getUri());
          }

          toggleLoading();
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
  if(auth && auth.token && Date.now() < auth.expires) {
    return true;
  }

  return false;
};

var getAuthCache = function() {
  return JSON.parse(window.localStorage.getItem('auth'));
};

var toggleLoading = function() {
  if(jQuery('#loading').length === 0) {
    var loading = jQuery('<div id="loading"></div>').appendTo('body');
    loading.show();
  } else {
    var loading = jQuery('#loading');
    loading.hide();
    loading.remove();
  }
};

var startRender = function() {
  if(window.pageName === 'main') {
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

      toggleLoading();
      jQuery.post('/api/save', params, function(resp) {
        if(resp.playlist) {
          jQuery('#new_playlist_name').text(resp.playlist);
        } else {
          jQuery('#new_playlist_name .modal-title').text('Error');
          jQuery('#new_playlist_name .modal-body').text(resp.error);
          jQuery('#new_playlist_name .btn').text('Try Again');
        }
        toggleLoading();
        jQuery('#completeModal').modal();
      }, "json");
    });
  } else if (window.pageName === 'playlists') {
    React.renderComponent(Playlists(), document.getElementById('main'));
  }
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