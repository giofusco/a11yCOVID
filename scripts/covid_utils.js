//
//
// created by Giovanni Fusco - The Smith-Kettlewell Eye Research Institute
//
// this file provides a set of smart functions to gather and process COVID data using https://api.covid19api.com/ APIs
//
//

let api_url = 'https://api.covid19api.com/';
let day_one_country_url = api_url + 'dayone/country/';
var country_summaries;
var timeline_active = new Object();



const global_table_headers =
	`<tr>
		<th scope=\"col\">Country</th>
		<th scope=\"col\">Active Cases</th>
		<th scope=\"col\">New Cases</th>
		<th scope=\"col\">Total Cases</th>
		<th scope=\"col\">New Recovered</th>
		<th scope=\"col\">Total Recovered</th>
		<th scope=\"col\">New Deaths</th>
		<th scope=\"col\">Total Deaths</th>
	</tr>`;


function sonify(data, f0, n_octaves) {
	console.log(data);
	// find d_max
	let f_max = f0 * 2 ** n_octaves;
	console.log(f_max)
	var d_max = -1;
	var d_min = 1e9;
	var values = Object.values(data);
	
	for (v = 0; v < values.length - 1; v++) {
		// console.log(v)
		if (values[v] > d_max) {
			d_max = values[v];
		}
		if (values[v] < d_min) {
			d_min = values[v];
		}
	}
	
	var w = d_max / (n_octaves);
	var frequencies = [];
	
	for (v = 0; v < values.length - 1; v++) {
		var bin_target = Math.floor(values[v] / w);
		var base_pitch = f0 * 2 ** bin_target;
		var rem = ((values[v] % w) / w) * (f0 * 2 ** (bin_target + 1) - f0 * 2 ** bin_target);
		frequencies[v] = base_pitch + rem;
	}
	
	var freq_max = -1;
	for (v = 0; v < frequencies.length; v++) {
		// console.log(v)
		if (frequencies[v] > freq_max) {
			freq_max = frequencies[v];
		}
	}
	console.log(freq_max);
	for (f = 0; f < frequencies.length; f++){
		frequencies[f] = (((frequencies[f] - f0) * (f_max - f0)) / (freq_max - f0)) + f0;
	}
	console.log(frequencies)
	playPulse(frequencies);

	

}

	    
	
	
function playPulse(freqs) {
		// for cross browser compatibility
	// create web audio api context
	var audioCtx = new (window.AudioContext || window.webkitAudioContext)();
	var gainNode = audioCtx.createGain();
	// gainNode.gain.value = 0.1;
	gainNode.gain.setValueAtTime(0.005, audioCtx.currentTime);
	// create Oscillator node
	var oscillator = audioCtx.createOscillator();
	
	oscillator.type = 'sine';
	
	oscillator.connect(audioCtx.destination);
	for (i = 0; i < freqs.length; i++)
		oscillator.frequency.setValueAtTime(freqs[i], audioCtx.currentTime + i * 0.05);
		gainNode.gain.setValueAtTime(0.005, audioCtx.currentTime + i * 0.05);
		oscillator.connect(gainNode).connect(audioCtx.destination);
	oscillator.start();
	oscillator.stop(audioCtx.currentTime + freqs.length*.05);
}
		//playPulse(1500);
	
		


function reconstruct_world_timeline(countries) {
// https://stackoverflow.com/questions/21819905/jquery-ajax-calls-in-for-loop	
	var progress = document.getElementById('fetching_progress');
	var cnt = countries.length;
	
	progress.max = cnt;
	progress.value = 0;

	
	for (i = 0; i < countries.length; i++) {
		
		(function (i) {
			var settings = {
				"async": true,
				"crossDomain": true,
				"url": day_one_country_url + countries[i].Slug,
				"method": "GET",
				"dataType" : "JSON"
			}
			$.ajax(settings).then(
				function (res) {
					cnt -= 1;
					progress.value += 1;
					if (res.length > 0) {
						for (d = 0; d < res.length; d++) {
							var tstamp = Date.parse(res[d].Date)
							if (timeline_active[tstamp] == null)
								timeline_active[tstamp] = res[d].Confirmed - (res[d].Recovered + res[d].Deaths);
							else
								timeline_active[tstamp] += res[d].Confirmed - (res[d].Recovered + res[d].Deaths);
						}
					}
					if (cnt == 0) {
						generate_world_active_plot();
						add_button('Sonify plot', 'sonify_button_section', 'sonify_active_button', 'sonify(timeline_active, 220, 4);');
						document.getElementById('fetching_progress_section').remove();
					}
				}, function () {
					console.log("[X] reconstruct_world_timeline");
				});
		})(i);
		
	}
	console.log("[OK] reconstruct_world_timeline");
}

function generate_world_active_plot() {
	timeline_active = sortKeys(timeline_active);
	x_labels = [];
	data = [];
	keys = Object.keys(timeline_active)
	for (k = 0; k < keys.length-1;k++) {
		var date = new Date(Number(keys[k]));
		data[data.length] = timeline_active[keys[k]]
		x_labels[x_labels.length] = `${date.getMonth()+1}-${date.getDate()}-${date.getYear()}`;
	}
	var ctx = $('#active_cases_chart');
	var data = {
		labels: x_labels,
		datasets: [
			{
				label: "Active Cases in the World",
				data: data,
				backgroundColor: "black",
				borderColor: "black",
				fill: false,
				lineTension: 0,
				radius: 4
			}]
	};
	//options
	var options = {
		responsive: true,
		title: {
			display: true,
			position: "top",
			text: "COVID-19 Active cases in the World",
			fontSize: 18,
			fontColor: "#111"
		},
		legend: {
			display: false,
			position: "bottom",
			labels: {
				fontColor: "#333",
				fontSize: 16
			}
		}
	};

	var chart = new Chart(ctx, {
		type: "line",
		data: data,
		options: options
	});
	
}

function setup_list_of_countries(select_id){
	var settings = {
		"async": true,
		"crossDomain": true,
		"url": "https://api.covid19api.com/countries",
		"method": "GET",
		"dataType" : "JSON"
	}

	$.ajax(settings, select_id).then(
	  function(res) {
			res.sort(get_sort_order("Country"));
			reconstruct_world_timeline(res);
	  	setup_country_selection_dom(select_id, res)
	    console.log( "[OK] GET_LIST_OF_COUNTRIES" );
	  }, function() {
	    console.log( "[X] GET_LIST_OF_COUNTRIES" );
	  });
}

function setup_summary(summary_id, summary_table_id) {
	var settings = {
		"async": true,
		"crossDomain": true,
		"url": "https://api.covid19api.com/summary",
		"method": "GET",
		"dataType" : "JSON"
	}

	$.ajax(settings, summary_id, summary_table_id).then(
		function (res) {
			country_summaries = res;
			setup_summary_dom(summary_id, res);
			//setup_summary_table_dom(summary_table_id, res);
	    	console.log( "[OK] SETUP SUMMARY" );
	  }, function() {
	    console.log( "[X] SETUP SUMMARY" );
	  });
}

// |||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||| //

// ******************* DOM/UI related functions *********************** //

function add_button(text, container_id, button_id, callback_string) {
	x = document.getElementById(container_id);
	var b = `<button id="${button_id}" onclick="${callback_string}">${text}</button>`;
	x.innerHTML += b;
}

function setup_country_selection_dom(select_id, countries){
	var x = document.getElementById(select_id);
	for (i=0; i < countries.length; i++){
		var option = document.createElement("option");
		option.text = countries[i].Country;
		option.value = countries[i].Slug;
		x.add(option);	
	}	 
}

function setup_summary_dom(dom_id, summary) {
	var x = document.getElementById(dom_id);	
	var summary_text = 
		`<p><small>Last updated on ${timestamp_to_date(Date.parse(summary.Countries[0].Date))}</small></p>
		<p>Currently there are
		${(summary.Global.TotalConfirmed - (summary.Global.TotalDeaths + summary.Global.TotalRecovered)).toLocaleString()} 
		<strong>active cases</strong> in the World. <br>
		Today there have been ${summary.Global.NewConfirmed.toLocaleString()} <strong>new infections</strong> world-wide
		so far, bringing the <strong>total</strong> to ${summary.Global.TotalConfirmed.toLocaleString()} COVID-19 cases. <br>
		${summary.Global.NewRecovered.toLocaleString()} people have <strong>recovered today</strong>, ${summary.Global.TotalRecovered.toLocaleString()}
		is the <strong>total recovered</strong>. <br>
		Unfortunately there have been ${summary.Global.NewDeaths.toLocaleString()} <strong>deaths</strong> today so far, 
		bringing the <strong>total deaths</strong> to ${summary.Global.TotalDeaths.toLocaleString()}.</p>`;
		//console.log(summary)

	x.innerHTML = summary_text;
}

function setup_summary_table_dom(dom_id, summary) {
	var x = document.getElementById(dom_id);	
	table = `<table id="world_table">` + global_table_headers;
	table += "<caption>Data from all the countries affected by COVID-19</caption>";
	countries = summary.Countries;
	// countries.sort(get_sort_order("NewConfirmed"));
	countries.sort(get_sort_order_active_cases());
	for (i = countries.length - 1; i >= 0; i--){
		data = countries[i];
		var row = "<tr>";
		row +=
			`<th scope="row"><a href=."/view.?country=${data.Slug}">${data.Country}</a></th>
			<td>${(data.TotalConfirmed - (data.TotalDeaths+data.TotalRecovered)).toLocaleString()}</td>
			<td>${data.NewConfirmed.toLocaleString()}</td>
			<td>${data.TotalConfirmed.toLocaleString()}</td>
			<td>${data.NewRecovered.toLocaleString()}</td>
			<td>${data.TotalRecovered.toLocaleString()}</td>
			<td>${data.NewDeaths.toLocaleString()}</td>
			<td>${data.TotalDeaths.toLocaleString()}</td>
			</tr>`;
		table += row;
		
	}
	table += '</table>';
	x.innerHTML += table;
}

// ||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||| //


// *************************** Utils *********************************** //
//Comparer Function, sorts collection by property prop
function get_sort_order(prop) {  
	return function(a, b) {  
	    if (a[prop] > b[prop]) {  
            return 1;  
        } 
        else if (a[prop] < b[prop]) {  
    	    return -1;  
        }  
        return 0;  
    }  
}

function get_sort_order_active_cases() {  
	return function(a, b) {  
		if (a.TotalConfirmed - (a.TotalRecovered + a.TotalDeaths) >
			b.TotalConfirmed - (b.TotalRecovered + b.TotalDeaths)) {  
            return 1;  
        } 
        else if (a.TotalConfirmed - (a.TotalRecovered + a.TotalDeaths) >
				b.TotalConfirmed - (b.TotalRecovered + b.TotalDeaths)) {  
    	    return -1;  
        }  
        return 0;  
    }  
}  

function timestamp_to_date(tstamp){
	var d = new Date(tstamp);
	//console.log(d)
	// var date_string =  String((d.getMonth()+1) + '/' + (d.getDate()) + '/' + d.getFullYear() + ' ' + d.getHours() + ':' + d.getMinutes());
	return d;
}

// Sorted keys are obtained in 'key' array 
function sortKeys(obj_1) { 
	var key = Object.keys(obj_1) 
	.sort(function order(key1, key2) { 
		if (key1 < key2) return -1; 
		else if (key1 > key2) return +1; 
		else return 0; 
	});  
	  
	// Taking the object in 'temp' object 
	// and deleting the original object. 
	var temp = {}; 
	  
	for (var i = 0; i < key.length; i++) { 
		temp[key[i]] = obj_1[key[i]]; 
		delete obj_1[key[i]]; 
	}  

	// Copying the object from 'temp' to  
	// 'original object'. 
	for (var i = 0; i < key.length; i++) { 
		obj_1[key[i]] = temp[key[i]]; 
	}  
	return obj_1; 
} 
