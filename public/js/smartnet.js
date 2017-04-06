//var socket = io.connect('http://robotastic.com');
var channels;
var nac2d0;
var nacf18;
var nac1f0;
var source_names = {};
var per_page;
var socket;
var live = false;
var star = false;
var direction = false;
var now_playing = null;
var autoplay = false;


var groups = [{
	name: 'Cabarrus Law',
	code: 'tag-cabarrus-law'
}, {
	name: 'Cabarrus Sheriff',
	code: 'group-cabarrus sheriff'
}, {
	name: 'Concord Police',
	code: 'group-concord police'
}, {
	name: 'Kannapolis Police',
	code: 'group-kannapolis police'
}, {
	name: 'Cabarrus Fire',
	code: 'tag-cabarrus-fire'
}, {
	name: 'Concord Fire',
	code: 'tag-concord-fire'
}, {
	name: 'Kannapolis Fire',
	code: 'tag-kannapolis-fire'
}, {
	name: 'Cabarrus EMS/FIRE',
	code: 'tag-cabarrus-ems-fire'
}, {
	name: 'Cabarrus Power',
	code: 'tag-cabarrus-power'
}, {
	name: 'Cabarrus Jail',
	code: 'tag-cabarrus-jail'
}, {
	name: 'Cabarrus Bus',
	code: 'tag-cabarrus-bus'
}, {
	name: 'Cabarrus Event',
	code: 'tag-cabarrus-event'
}, {
	name: 'Cabarrus Analog',
	code: 'tag-cabarrus-analog'
}];
var federal_filter = [{
	name: 'US Forestry',
	code: 'tag-us-forestry'
}, {
	name: 'US Fish and Wildlife',
	code: 'group-us-fish-and-wildlife'
}, {
	name: 'FBI',
	code: 'group-fbi'
}, {
	name: 'Federal Common',
	code: 'group-federal-common'
}, {
	name: 'ATF',
	code: 'tag-atf'
}, {
	name: 'DEA',
	code: 'tag-dea'
}, {
	name: 'Cabarrus Analog',
	code: 'tag-cabarrus-analog'
}];
var state_filter = [{
	name: 'Air',
	code: 'tag-air'
}, {
	name: 'NC Wildlife',
	code: 'tag-nc-wildlife'
}, {
	name: 'Viper Medical',
	code: 'tag-viper-medical'
}, {
	name: 'Statewide Event',
	code: 'tag-statewide-event'
}, {
	name: 'HP Troop All',
	code: 'tag-troop-all'
}, {
	name: 'HP Troop A',
	code: 'tag-troop-a'
}, {
	name: 'HP Troop B',
	code: 'tag-troop-b'
}, {
	name: 'HP Troop C',
	code: 'tag-troop-c'
}, {
	name: 'HP Troop D',
	code: 'tag-troop-d'
}, {
	name: 'HP Troop E',
	code: 'tag-troop-e'
}, {
	name: 'HP Troop F',
	code: 'tag-troop-f'
}, {
	name: 'HP Troop G',
	code: 'tag-troop-g'
}, {
	name: 'HP Troop H',
	code: 'tag-troop-h'
}, {
	name: 'HP Troop Various',
	code: 'tag-troop-various'
}, {
	name: 'NC Parks',
	code: 'tag-nc-parks'
}, {
	name: 'Department of Corrections',
	code: 'tag-department-corrections'
}, {
	name: 'Department of Defense',
	code: 'tag-department-defense'
}, {
	name: 'Domestic Preparedness and Readiness',
	code: 'tag-domestic-preparedness'
}, {
	name: 'NC DOT',
	code: 'tag-nc-dot'
}, {
	name: 'NC National Guard',
	code: 'tag-nc-national-guard'
}, {
	name: 'SBI',
	code: 'tag-nc-sbi'
}, {
	name: 'License and Theft',
	code: 'tag-nc-license-theft'
}, {
	name: 'HART',
	code: 'tag-nc-hart'
}, {
	name: 'Regional EMS',
	code: 'tag-regional-ems'
}, {
	name: 'Fairgrounds',
	code: 'tag-fairgrounds'
}, {
	name: 'Ports Authority',
	code: 'tag-ports-authority'
}, {
	name: 'Fire Marshal',
	code: 'tag-nc-fire-marshal'
}, {
	name: 'VA',
	code: 'tag-nc-va'
}, {
	name: 'Department of Agriculture',
	code: 'tag-nc-department-agriculture'
}, {
	name: 'ABC',
	code: 'tag-abc'
}, {
	name: 'Alert',
	code: 'tag-alert'
}];
var other_filter = [{
	name: 'UNCC',
	code: 'tag-uncc'
}, {
	name: 'Duke',
	code: 'tag-duke'
}, {
	name: 'Interop',
	code: 'tag-interop'
}, {
	name: 'Rowan',
	code: 'tag-rowan'
}, {
	name: 'Huntersville',
	code: 'tag-huntersville'
}, {
	name: 'Matthews',
	code: 'tag-matthews'
}, {
	name: 'Davidson',
	code: 'tag-davidson'
}, {
	name: 'Monroe',
	code: 'tag-monroe'
}, {
	name: 'Mint Hill',
	code: 'tag-mint-hill'
}, {
	name: 'Radio',
	code: 'tag-radio'
}, {
	name: '',
	code: 'tag-'
}];
var mecklenburg = [{
	name: 'CMPD All',
	code: 'tag-cmpd-all'
}, {
	name: 'CMPD Dispatch',
	code: 'tag-cmpd-dispatch'
}, {
	name: 'CMPD Central',
	code: 'tag-cmpd-central'
}, {
	name: 'CMPD Eastway',
	code: 'tag-cmpd-eastway'
}, {
	name: 'CMPD Freedom',
	code: 'tag-cabarrus-fire'
}, {
	name: 'CMPD Hickory Grove',
	code: 'tag-cmpd-hickory_grove'
}, {
	name: 'CMPD Independence',
	code: 'tag-cmpd-independence'
}, {
	name: 'CMPD Metro',
	code: 'tag-cmpd-metro'
}, {
	name: 'CMPD North',
	code: 'tag-cmpd-north'
}, {
	name: 'CMPD North Tryon',
	code: 'tag-cmpd-north_tryon'
}, {
	name: 'CMPD Providence',
	code: 'tag-cmpd-providence'
}, {
	name: 'CMPD South',
	code: 'tag-cmpd-south'
}, {
	name: 'CMPD Steele Creek',
	code: 'tag-cmpd-steele_creek'
}, {
	name: 'CMPD University City',
	code: 'tag-cmpd-university_city'
}, {
	name: 'CMPD Westover',
	code: 'tag-cmpd-westover'
}, {
	name: 'CMPD Tactical',
	code: 'tag-cmpd-tactical'
}, {
	name: 'CMPD Swat',
	code: 'tag-cmpd-swat'
}, {
	name: 'CMPD CEU',
	code: 'tag-cmpd-ceu'
}, {
	name: 'CMPD VCAT',
	code: 'tag-cmpd-vcat'
}, {
	name: 'CMPD Bomb Squad',
	code: 'tag-cmpd-bomb_squad'
}, {
	name: 'Sheriff All',
	code: 'tag-meck-sheriff-all'
}, {
	name: 'Sheriff Dispatch',
	code: 'tag-meck-sheriff-dispatch'
}, {
	name: 'Sheriff Tactical',
	code: 'tag-meck-sheriff-tactical'
}, {
	name: 'Charlotte Fire All',
	code: 'tag-charlotte-fire-all'
}, {
	name: 'Charlotte Fire Dispatch',
	code: 'tag-charlotte-fire-dispatch'
}, {
	name: 'Charlotte Fire Ops',
	code: 'tag-charlotte-fire-ops'
}, {
	name: 'Charlotte EMS All',
	code: 'tag-charlotte-ems-all'
}, {
	name: 'Charlotte EMS Dispatch',
	code: 'tag-charlotte-ems-dispatch'
}, {
	name: 'Charlotte EMS Ops',
	code: 'tag-charlotte-ems-ops'
}, {
	name: 'Mecklenburg Trash',
	code: 'tag-meck-trash'
}, {
	name: 'Mecklenburg Water',
	code: 'tag-meck-water'
}, {
	name: 'Mecklenburg Jail',
	code: 'tag-mecklenburg-jail'
}, {
	name: 'Mecklenburg Fire All',
	code: 'tag-meck-fire'
}, {
	name: 'Mecklenburg EMS All',
	code: 'tag-meck-ems'
}, {
	name: 'Mecklenburg Law All',
	code: 'tag-meck-law'
}, {
	name: 'Mecklenburg Fire Dispatch',
	code: 'tag-meck-fire-dispatch'
}, {
	name: 'Mecklenburg EMS Dispatch',
	code: 'tag-meck-ems-dispatch'
}, {
	name: 'Mecklenburg Law Dispatch',
	code: 'tag-meck-law-dispatch'
}, {
	name: 'CATS All',
	code: 'tag-cats-all'
}, {
	name: 'CATS Bus',
	code: 'tag-cats-bus'
}, {
	name: 'CATS Rail',
	code: 'tag-cats-rail'
}, {
	name: 'Mecklenburg Events Digital',
	code: 'tag-meck-event-digital'
}, {
	name: 'Mecklenburg Events Analog',
	code: 'tag-meck-event-analog'
}, {
	name: 'BOA Stadium All',
	code: 'tag-mecklenburg-boa-stadium-all'
}];

if(typeof console === "undefined") {
    console = {
        log: function() { },
        debug: function() { }
    };
}


function tweet_char_count() {
    // 140 is the max message length
    var remaining = 117 - $('#modal-tweet-text').val().length;
    $('#modal-tweet-char-left').text(remaining + ' chars left');
}

function twitter_success(user_login) {
	$('#user-bar').html('<div class="user-login-link"><a href="/logout">Log Out</a></div><img src="' + user_login.photos[0].value + '" class="img-circle pull-right">');
	user = {
		displayName: user_login.displayName,
		id: user_login.id,
		photo: user_login.photos[0].value,
		username: user_login.username
	}
}

function tweet_call(tweet) {
	var data = {tweet: tweet};
$.ajax({
		url: "/tweet",
		type: "POST",
		dataType: "json",
		cache: false,
		data: data,
		timeout: 5000,
		complete: function() {
			//called when complete
			//console.log('process complete');
		},

		success: function(data) {
			
		},

		error: function() {
			//console.log('process error');
		},
	});

}

function star_call(row) {
	var objectId = row.data("objectId");
	var url = "/star/" + objectId;

	$.ajax({
		url: url,
		type: "GET",
		dataType: "json",
		contentType: "application/json",
		cache: false,
		timeout: 5000,
		complete: function() {
			//called when complete
			//console.log('process complete');
		},

		success: function(data) {
			$(".star-count", row).text(data.stars);
			$(".star-button", row).unbind( "click" );
			if (data.stars==1) {
				$(".star-button", row).removeClass('glyphicon-star-empty').addClass('glyphicon-star');
				$(".star-button", row).unbind( "mouseenter" );
				$(".star-button", row).unbind( "mouseleave" );
			}
		},

		error: function() {
			//console.log('process error');
		},
	});
}

function unstar_call(row) {
	var objectId = row.data("objectId");
	var url = "/unstar/" + objectId;

	$.ajax({
		url: url,
		type: "GET",
		dataType: "json",
		contentType: "application/json",
		cache: false,
		timeout: 5000,
		complete: function() {
			//called when complete
			//console.log('process complete');
		},

		success: function(data) {
			$(".star-count", row).text(data.stars);
			$(".star-button", row).unbind( "click" );
			if (data.stars==1) {
				$(".star-button", row).removeClass('glyphicon-star-empty').addClass('glyphicon-star');
				$(".star-button", row).unbind( "mouseenter" );
				$(".star-button", row).unbind( "mouseleave" );
			}
		},

		error: function() {
			//console.log('process error');
		},
	});
}


function play_call(row) {
	var filename = row.data("filename");
	//console.log("Trying to play call");
	var ext = filename.split('.').pop();
	var setMedia = {};
	setMedia[ext] = "/media" + filename;

	if (now_playing) {
		now_playing.removeClass("now-playing");
	}
	now_playing = row;
	//console.log("trying to play: " + filename);
	row.removeClass("live-call");
	row.addClass("now-playing");

	$("#jquery_jplayer_1").jPlayer("setMedia", setMedia).jPlayer("play");

}


function call_over(event) {
	if (now_playing) {
		now_playing.removeClass("now-playing");
	}
	if (autoplay) {
		if (now_playing.prev().length != 0) {
			play_call(now_playing.prev());
		} else {
			now_playing = null;
		}
	} else {
		now_playing = null;
	}
}

function source_string(call) {
	var srcString = "";
	if (call.srcList) {
		for (var src in call.srcList) {
			srcNum = call.srcList[src];
			srcString = srcString + "<a href=http://172.72.85.194:5002/scanner/src-" + srcNum + ">";
			if (source_names.hasOwnProperty(srcNum)) {
				srcString = srcString + source_names[srcNum].shortName;
			} else {
				srcString = srcString + srcNum;
			}
			srcString = srcString + "</href> "
		}
	}

	return srcString;
}

function print_call_row(call, direction, live) {



	var time = new Date(call.time);
	var newrow = $("<tr class='call-row'/>").data('filename', call.filename).data('objectId', call.objectId);

	if (live) {
		newrow.addClass("live-call");
	}

	var buttoncell = $("<td/>");
	//var playbutton = $('<span class="glyphicon glyphicon-play call-play"></span>');
	var playbutton = $('<i class="icon-play call-play"></i><span class="glyphicon glyphicon-play call-play"></span>');
	playbutton.click(function() {
		row = $(this).closest("tr");
		play_call(row);
	});

	buttoncell.append(playbutton);
	newrow.append(buttoncell);
	var hexnac = call.nac.toString(16);
	if (typeof channels[call.talkgroup] == 'undefined') {
		newrow.append("<td>" + call.len + "</td>");
		newrow.append("<td>" + hexnac + "</td>");
		newrow.append("<td>" + call.talkgroup + "</td>");
		newrow.append("<td>" + time.toLocaleTimeString() + " - " + time.toLocaleDateString()  + "</td>");
		newrow.append("<td>" + source_string(call) + "</td>");
		newrow.append("<td>" + "<a href=http://172.72.85.194:5002/scanner/tg-" + call.talkgroup + ">" + call.talkgroup + "</href>" + "</td>");
		newrow.append("<td>Unknown</td>");
		newrow.append("<td>Unknown</td>");
	} else {
		newrow.append("<td>" + call.len + "</td>");
//                newrow.append("<td>" + call.freq + "</td>");
		newrow.append("<td>" + hexnac + "</td>");
		newrow.append("<td>" + channels[call.talkgroup].alpha + "</td>");
		newrow.append("<td>" + time.toLocaleTimeString() + " - " + time.toLocaleDateString()  +"</td>");
		newrow.append("<td>" + source_string(call) + "</td>");
		newrow.append("<td>" + "<a href=http://172.72.85.194:5002/scanner/tg-" + channels[call.talkgroup].num + ">" + channels[call.talkgroup].small + "</href>" + "</td>");
		newrow.append("<td>" + channels[call.talkgroup].desc + "</td>");
		newrow.append("<td>" + channels[call.talkgroup].group + "</td>");
	}
	
	var actioncell = $("<td/>");
	/*
	var callview = $('<a href="/call/' + call.objectId + '"><span class="glyphicon glyphicon-link call-link"></span></a>');
	var linkview = $('<span class="glyphicon glyphicon-cloud-upload"></span>');
	*/

	var callview = $('<a href="/call/' + call.objectId + '"><i class="icon-file call-link"> </i></a><a href="/call/' + call.objectId + '"><span class="glyphicon glyphicon-link call-link"></span></a>');
	var linkview = $('<i class="icon-share-alt"> </i><span class="glyphicon glyphicon-bullhorn"></span>');
	var downloadview = $('<a href="http://172.72.85.194:5002/media' + call.filename +'"><span class="glyphicon glyphicon-download-alt download-link"></span></a>');
	if (call.stars == 0 ) {
		var starbutton = $('<span class="glyphicon glyphicon-star-empty star-button"></span>');
		var	starcount = $('<span class="star-count"></span>');
		starbutton.mouseenter(function() { 
			$( this ).removeClass('glyphicon-star-empty').addClass('glyphicon-star');
		});
		starbutton.mouseleave(function() { 
			$( this ).removeClass('glyphicon-star').addClass('glyphicon-star-empty');
		});
	} else {
		var starbutton = $('<span class="glyphicon glyphicon-star star-button"></span>');
		var	starcount = $('<span class="star-count">' + call.stars + '</span>');
	}
	var unstarbutton = $('<span class="glyphicon glyphicon-star-empty unstar-button"></span>');
	
	downloadview.mousedown(function() {
		row = $(this).closest("tr");
		star_call(row);
	});
	starbutton.click(function() {
		row = $(this).closest("tr");
		star_call(row);
	});
	unstarbutton.click(function() {
		row = $(this).closest("tr");
		unstar_call(row);
	});

	var btngroup = $('<td/>');

	poptent = "Share Call on Twitter";
	if (!user) {
		poptent = poptent + ". You need to Authenticate first.";
	}
	popoverOptions = {
		container: 'body',
		title: 'Tweet',
		placement: 'top',
		html: true,
		content: poptent,
		trigger: 'hover'
	};

	linkview.popover(popoverOptions);
	linkview.click(function() {
		if (!user) {
			window.open("/auth/twitter", "twitterAuthWindow", "menubar=0,resizable=0,location,width=600,height=400");
		} else {
			$('#modal-tweet').modal({
	  			keyboard: false
			});
			var row = $(this).closest("tr");
			var objectId = row.data("objectId");
			$('#modal-tweet-url').text('+ http://openmhz.com/call/'+ objectId);
			$('#modal-tweet-text-url').val('http://openmhz.com/call/'+ objectId);
		}
	});




	btngroup.append(callview);
	btngroup.append(linkview);
	btngroup.append(downloadview);

	btngroup.append(starbutton);
	if(call.stars!=0)
		btngroup.append(unstarbutton);
	btngroup.append(starcount);
	newrow.append(btngroup);
	

	if (live) {
		if (autoplay && (now_playing == null)) {
			var delay = Math.floor(Math.random() * 1000) + 500;
			setTimeout(play_call, delay, newrow);
		}
	}

	if (direction == 'newer') {
		$("#call_table").prepend(newrow);
	} else {
		$("#call_table").append(newrow);
	}

}

function filter_calls() {
	var code = $(this).data("code");
	var name = $(this).data("name");
	$('#filter-title').html(name);
	filter_code = code;
	fetch_calls();
	if (live) {

		socket.send(JSON.stringify({
			type: 'code',
 			code: filter_code
		}));

	}
}

function add_filters() {


	for (var i = 0; i < groups.length; i++) {
		var group = groups[i];
		$("#groups-filter").append($('<li><a href="#">' + group.name + '</a></li>').data('code', group.code).data('name', group.name).click(filter_calls));
	}
	for (var i = 0; i < mecklenburg.length; i++) {
		var meck = mecklenburg[i];
		$("#mecklenburg-filter").append($('<li><a href="#">' + meck.name + '</a></li>').data('code', meck.code).data('name', meck.name).click(filter_calls));
	}
	for (var i = 0; i < state_filter.length; i++) {
		var state = state_filter[i];
		$("#state-filter").append($('<li><a href="#">' + state.name + '</a></li>').data('code', state.code).data('name', state.name).click(filter_calls));
	}
	for (var i = 0; i < federal_filter.length; i++) {
		var federal = federal_filter[i];
		$("#federal-filter").append($('<li><a href="#">' + federal.name + '</a></li>').data('code', federal.code).data('name', federal.name).click(filter_calls));
	}
	for (var i = 0; i < other_filter.length; i++) {
		var other = other_filter[i];
		$("#other-filter").append($('<li><a href="#">' + other.name + '</a></li>').data('code', other.code).data('name', other.name).click(filter_calls));
	}
}

function add_tg_filter() {
	for (var chan_num in channels) {
		if (channels.hasOwnProperty(chan_num)) {
			var tg = channels[chan_num];
			$("#tg-filter").append($('<li><a href="#">' + chan_num + ' - ' + tg.desc + '</a></li>').data('code', 'tg-' + chan_num).data('name', tg.desc).click(filter_calls));

		}
	}
}



function nav_click() {
	var url = $(this).data('url');
	fetch_calls("/calls" + url);

}

function fetch_calls(url) {

	if (!url) {
		if (star) {
			url = "/stars";
		} else {
			url = "/calls";
		}
		if (filter_date != "") {
			if(direction){
				var url = url + "/older/" + filter_date.getTime();
			}
			else{
			var url = url + "/newer/" + filter_date.getTime();
			}
		}
		if (filter_code != "") {
			var url = url + "/" + filter_code;
		}
	}
	//console.log("Trying to fetch data from this url: " + url);
	$.ajax({
		url: url,
		type: "GET",
		dataType: "json",
		contentType: "application/json",
		cache: false,
		timeout: 5000,
		complete: function() {
			//called when complete
			//console.log('process complete');
		},

		success: function(data) {
			var browser_url = url.substring(6);
			browser_url = '/scanner' + browser_url;
			//console.log(browser_url);
			if (window.history && history.pushState) {
				window.history.pushState(data, "page 2", browser_url);
			}
			$("#call_table").empty();
			if (typeof data.calls !== "undefined") {
				for (var i = 0; i < data.calls.length; i++) {
					//console.log(data.calls.length);
					//console.log(data.calls[i]);
					print_call_row(data.calls[i], data.direction, false);
				}
			}

			if (data.direction == 'newer') {
				var newer_time = new Date(data.calls[data.calls.length - 1].time);
				var older_time = new Date(data.calls[0].time);
			} else {
				var older_time = new Date(data.calls[data.calls.length - 1].time);
				var newer_time = new Date(data.calls[0].time);
			}

			var newer_url = '/newer/' + newer_time.getTime();
			var older_url = '/older/' + older_time.getTime();

			if (filter_code != '') {
				newer_url = newer_url + "/" + filter_code;
				older_url = older_url + "/" + filter_code;
			}

			$('.older-btn').data('url', older_url);
			$('.newer-btn').data('url', newer_url);
			if (data.count <= per_page) {
				if (data.direction == 'newer') {
					$('.newer-btn').hide();
				} else {
					$('.older-btn').hide();
				}
			} else {
				$('.newer-btn').show();
				$('.older-btn').show();
			}

		},

		error: function() {
			//console.log('process error');
		},
	});
}

function find_code_name(code) {
	var i;
	if (code.substring(0, 3) == 'tg-') {
		tg_num = parseInt(code.substring(3));

		if (channels.hasOwnProperty(tg_num)) {
			var tg = channels[tg_num];
			return tg.desc;

		}

	}
	for (var i = 0; i < groups.length; i++) {
		var group = groups[i];
		if (group.code == code) {
			return group.name
		}
	}

	return 'All';
}

function init_table() {
	per_page = 20;

	$('#filter-title').html("All");
	fetch_calls();

}




function socket_connect() {

	if (!socket) {

		console.log('func socket_connect');
		socket = new WebSocket('ws://172.72.85.194:5002');
    socket.onmessage = function(e) {
        console.log(e.data); //prints [Object object] string and not the object
        var message = JSON.parse(e.data);
        if (typeof message.type !== "undefined") {
	        if (message.type == 'calls') {
	        	if (typeof message.calls !== "undefined") {
					for (var i = 0; i < message.calls.length; i++) {
						print_call_row(message.calls[i], 'newer', true);
					}
				}
				if (typeof message.talkgroup !== "undefined") {
					print_call_row(message, 'newer', true);
				}
	        }
   		}	




    };
    socket.onopen = function(e) {
    	socket.send(JSON.stringify({
    		type: 'code',
 			code: filter_code
		}));
    };
	} else {
		//console.log('func socket_reconnect');
		socket.socket.reconnect();
	}
}



function socket_disconnect() {
	//console.log('func socket_disconnect');
	if (socket) socket.disconnect();
}

$(document).ready(function() {

	now_playing = null;

	$.ajax({
		url: "/channels",
		type: "GET",
		contentType: "application/json",
		success: function(data) {
			channels = data.channels;
			source_names = data.source_names;
			add_filters();
			add_tg_filter();
							if(window.location.href.indexOf("/older/")){
					direction = true;
				}
			init_table();
			if (filter_code) {
				$('#filter-title').html(find_code_name(filter_code));
			}
			// if the page got loaded with a filtered date
			if (filter_date) {
				$('#filter-date').html(filter_date.toDateString());
			}
		}
	});


	$(function() {
		$('.form_datetime').datetimepicker({
			format: "MM dd yyyy - hh:ii",
			autoclose: true,
			minuteStep: 10,
			showMeridian: true,
			endDate: new Date()
		}).on('changeDate', function(ev) {
			socket_disconnect();


			$('#filter-date').html(ev.date.toDateString());
			var userOffset = ev.date.getTimezoneOffset() * 60000
			filter_date = new Date(ev.date.getTime() + userOffset);
			fetch_calls();
			live = false;
		});
	});
	$("#jquery_jplayer_1").jPlayer({
		ready: function() {
			$(this).jPlayer();
		},
		swfPath: "/js/Jplayer.swf",
		supplied: "m4a",
		solution: "html,flash" //,
		//preload: "metadata"
	});
	$("#jquery_jplayer_1").bind($.jPlayer.event.ended, function(event) {
		call_over(event);
	});
	$('#live-btn').on('click', function(e) {
		live = !live;
		if (live) {
			socket_connect();
			filter_date = "";
			$('#filter-date').html("Live");
			fetch_calls();
			$('#live-btn').addClass('active');
		} else {
			socket_disconnect();
			filter_date = "";
			$('#filter-date').html("");
			$('#live-btn').removeClass('active');
		}
	});
	$('#star-btn').on('click', function(e) {
		star = !star;
		fetch_calls();
		if (star) {
			$('#star-btn').addClass('active');
		} else {
			$('#star-btn').removeClass('active');
		}
	});
	$('.newer-btn').on('click', nav_click);
	$('.older-btn').on('click', nav_click);
	$('#nav-filter').affix({
		offset: {
			top: 0
		}
	})
	autoplayOptions = {
		placement: 'bottom',
		title: 'Autoplay'
	};
	$('#autoplay-btn').tooltip(autoplayOptions);
	$('#autoplay-btn').on('click', function(e) {
		autoplay = !autoplay;
		if (autoplay) {
			$('#autoplay-btn').addClass('active');
		} else {
			$('#autoplay-btn').removeClass('active');
		}
		$('#autoplay-btn').blur();
	});

	$('#modal-tweet-text').change(tweet_char_count);
    $('#modal-tweet-text').keyup(tweet_char_count);

	$('#modal-tweet-btn').on('click', function(e) {
		var tweet = $('#modal-tweet-text').val() + ' ' + $('#modal-tweet-text-url').val();
		tweet_call(tweet);
		$('#modal-tweet-text').val('');
		$('#modal-tweet').modal('hide');
	});
	$('#user-login-btn').on('click', function(e) {
		window.open("/auth/twitter", "twitterAuthWindow", "menubar=0,resizable=0,location,width=600,height=400");
	});

});
