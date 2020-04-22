//
//
// created by Giovanni Fusco - The Smith-Kettlewell Eye Research Institute
//
//
//
//

let api_url = 'https://api.covid19api.com/';
// let day_one_country_url = api_url + 'dayone/country/';
var country_summaries;
var global_summary = [];
var timeline_active = new Object();
var countries = [];
var country_name2iso = []
var country_iso2name = []
var world = [];

// this function handles the event triggered after getting the data
$(document).bind('dataReadyEvent', function (e) {
	console.log('Data loaded, creating page');
	document.getElementById('fetching_progress_section').remove(); // remove progress bar because we are done loading
	create_summary_section('World', 'main_article');
	create_summary_section('Italy', 'main_article');
	//generate_world_active_plot(); // generate 
	//var section_html 
	//add_button('Sonify plot', 'sonify_button_section', 'sonify_active_button', 'sonify(world[\'active_timeline\'], 220, 4);');
});


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


// use country_name = 'World' to get world stats
function create_summary_section(country_name, container_id) {
	var container = document.getElementById(container_id);
	var section = document.createElement('section');
	var canvas_active = document.createElement('canvas');
	var canvas_confirmed = document.createElement('canvas');
	canvas_active.id = `canvas_active_${country_name}`
	canvas_confirmed.id = `canvas_new_confirmed_${country_name}`
	
	section.innerHTML = `<h2>${country_name}</h2>`;
	var summary_paragraph = document.createElement('p'); 
	summary_paragraph.innerHTML =`<small>Last updated on ${timestamp_to_date(Date.parse(country_summaries[country_name].Date))}</small></p>
	Currently there are
	${(country_summaries[country_name].TotalConfirmed - (country_summaries[country_name].TotalDeaths + country_summaries[country_name].TotalRecovered)).toLocaleString()} 
	<strong>active cases</strong> in ${country_name}. <br>
	The <strong>total number</strong> of COVID-19 infections is ${country_summaries[country_name].TotalConfirmed.toLocaleString()}. <br>
	People <string>recovered today</strong> ${country_summaries[country_name].NewRecovered.toLocaleString()}  , 
	<strong>Total recovered</strong> ${country_summaries[country_name].TotalRecovered.toLocaleString()}. <br>
	Unfortunately there have been ${country_summaries[country_name].NewDeaths.toLocaleString()} <strong>deaths</strong> today so far, 
	bringing the <strong>total deaths</strong> to ${country_summaries[country_name].TotalDeaths.toLocaleString()}.`;

	section.appendChild(summary_paragraph);	

	canvas_active.setAttribute('aria-label', `This plot shows the evolution of the global number of active cases of COVID-19 
								from the beginning of the epidemic to the latest update.` );
								canvas_active.innerHTML = `<p role="region" aria-live="polite"
								id="active_cases_chart_fallback">Soon I'll work to generate better captioning for plots.</p>`;
	generate_line_plot(canvas_active, `Active CODVID-19 Cases in ${country_name}`, 4, 'orange', 'black', false, countries[country_name]['active_timeline']);

	section.appendChild(canvas_active);
	add_button(`Sonify ${country_name} Active Cases Plot`, section, `sonify_active_${country_name}_button_id`, `sonify(countries['${country_name}']['active_timeline'], 220, 4);`);
	
	
	if (country_name !== 'World') {
		section.appendChild(canvas_confirmed);
		canvas_confirmed.setAttribute('aria-label', `This plot shows the daily number of new COVID-19 
		from the beginning of the epidemic to the latest update.` );
		canvas_confirmed.innerHTML = `<p role="region" aria-live="polite"
		id="active_cases_chart_fallback">Soon I'll work to generate better captioning for plots.</p>`;

		var conf_smoothed = moving_average(countries[`${country_name}`]['confirmed_daily'], 3);
		generate_line_plot(canvas_confirmed, `Daily new CODVID-19 infections in  ${country_name}`, 4, 'red', 'black', false, conf_smoothed);


		console.log("Smooth!" + conf_smoothed)
		add_button(`Sonify ${country_name} Daily New Cases Plot`, section, `sonify_confirmed_${country_name}_button_id`,
			`sonify(moving_average(countries['${country_name}']['confirmed_daily'], 3), 220, 1);`);
	}
	
	section.id = `${country_name}_summary`;
	
	container.appendChild(section);
}



function sonify(data, f0, n_octaves) {
	let f_max = f0 * 2 ** n_octaves;
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
	var frequencies = [];
	for (v = 0; v < values.length; v++) {
		frequencies[v] = (((data[v] - d_min) * (f_max - f0)) / (d_max - d_min)) + f0;
	}
	playPulse(frequencies);
}



// function sonify(data, f0, n_octaves) {
// 	// find d_max
// 	let f_max = f0 * 2 ** n_octaves;
// 	var d_max = -1;
// 	var d_min = 1e9;
// 	var values = Object.values(data);
	
// 	for (v = 0; v < values.length - 1; v++) {
// 		// console.log(v)
// 		if (values[v] > d_max) {
// 			d_max = values[v];
// 		}
// 		if (values[v] < d_min) {
// 			d_min = values[v];
// 		}
// 	}
// 	var w = d_max / (n_octaves);
// 	var frequencies = [];
// 	for (v = 0; v < values.length - 1; v++) {
// 		var bin_target = Math.floor(values[v] / w);
// 		var base_pitch = f0 * 2 ** bin_target;
// 		var rem = ((values[v] % w) / w) * (f0 * 2 ** (bin_target + 1) - f0 * 2 ** bin_target);
// 		frequencies[v] = base_pitch + rem;
// 	}
// 	var freq_max = -1;
// 	for (v = 0; v < frequencies.length; v++) {
// 		if (frequencies[v] > freq_max) {
// 			freq_max = frequencies[v];
// 		}
// 	}
// 	for (f = 0; f < frequencies.length; f++){
// 		frequencies[f] = (((frequencies[f] - f0) * (f_max - f0)) / (freq_max - f0)) + f0;
// 	}
// 	playPulse(frequencies);
// }
	
function playPulse(freqs) {
	console.log(freqs)
		// for cross browser compatibility
	// create web audio api context
	var audioCtx = new (window.AudioContext || window.webkitAudioContext)();
	var gainNode = audioCtx.createGain();
	
  	gainNode.gain.minValue = 0;
	gainNode.gain.maxValue = 1;
	gainNode.gain.value = 0.5;
	// gainNode.gain.setValueAtTime(0.005, audioCtx.currentTime);
	// create Oscillator node
	var oscillator = audioCtx.createOscillator();
	oscillator.type = 'sine';
	
	for (i = 0; i < freqs.length; i++)
		oscillator.frequency.setValueAtTime(freqs[i], audioCtx.currentTime + i * 0.05);
		// gainNode.gain.setValueAtTime(0.005, audioCtx.currentTime + i * 0.05);
	oscillator.connect(gainNode).connect(audioCtx.destination);
	// oscillator.connect(audioCtx.destination);
	oscillator.start();
	oscillator.stop(audioCtx.currentTime + freqs.length*.05);
}
		
function prepare_data() {
	
	for (c in countries){
		let recovered = countries[c]['recovered'];
		let deaths = countries[c]['deaths'];
		let confirmed = countries[c]['confirmed'];
		countries[c]['dates'] = Object.keys(recovered[0]);
		countries[c]['dates'].shift() // removes non relevant keys by popping the first 4 elements
		countries[c]['dates'].shift()
		countries[c]['dates'].shift()
		countries[c]['dates'].shift()
		countries[c]['confirmed_timeline'] = [];
		countries[c]['deaths_timeline'] = [];
		countries[c]['recovered_timeline'] = [];
		countries[c]['active_timeline'] = [];

		countries[c]['confirmed_daily'] = [];
		countries[c]['recovered_daily'] = [];
		countries[c]['deaths_daily']= [] ;

		for (i = 0; i < countries[c]['dates'].length; i++){
			countries[c]['confirmed_timeline'][i] = 0;
			countries[c]['deaths_timeline'][i] = 0;
			countries[c]['recovered_timeline'][i] = 0;
			countries[c]['active_timeline'][i] = 0;
		}
		// accumulate cases across multiple regions, if any
		for (i = 0; i < recovered.length; i++) {
			var keys = (countries[c]['dates']);
			for (k in keys) {
				countries[c]['confirmed_timeline'][k] += Number(confirmed[i][keys[k]]);
				countries[c]['deaths_timeline'][k] += Number(deaths[i][keys[k]]);
				countries[c]['recovered_timeline'][k] += Number(recovered[i][keys[k]]);
				countries[c]['active_timeline'][k] += Number(confirmed[i][keys[k]]) - (Number(deaths[i][keys[k]]) + Number(recovered[i][keys[k]]));
			}
		}
	}

	for (i = 0; i < countries[c]['dates'].length; i++) {
		countries[c]['confirmed_daily'][i] = 0;
		countries[c]['deaths_daily'][i] = 0;
		countries[c]['recovered_daily'][i] = 0;
	}

	countries['World'] = [];
	countries['World']['dates'] = countries['Italy']['dates'];
	countries['World']['confirmed_timeline'] = [];
	countries['World']['deaths_timeline'] = [];
	countries['World']['recovered_timeline'] = [];
	countries['World']['active_timeline'] = [];

	//init arrays
	for (i = 0; i < countries['World']['dates'].length; i++){
		countries['World']['confirmed_timeline'][i] = 0;
		countries['World']['deaths_timeline'][i] = 0;
		countries['World']['recovered_timeline'][i] = 0;
		countries['World']['active_timeline'][i] = 0;
	}
	for (c in countries) {
		for (i = 0; i < countries['World']['dates'].length; i++) {
			countries['World']['confirmed_timeline'][i] += countries[c]['confirmed_timeline'][i];
			countries['World']['deaths_timeline'][i] += countries[c]['deaths_timeline'][i];
			countries['World']['recovered_timeline'][i] += countries[c]['recovered_timeline'][i];
			countries['World']['active_timeline'][i] += countries[c]['active_timeline'][i];
			if (c !== 'World') {
				if (i == 0) {
					console.log(countries[c]['confirmed_daily'])
					countries[c]['confirmed_daily'][i] = countries[c]['confirmed_timeline'][i];
					countries[c]['deaths_daily'][i] = countries[c]['deaths_timeline'][i];
					countries[c]['recovered_daily'][i] = countries[c]['recovered_timeline'][i];
				}
				else {
					countries[c]['confirmed_daily'][i] = countries[c]['confirmed_timeline'][i] - countries[c]['confirmed_timeline'][i - 1];
					countries[c]['deaths_daily'][i] = countries[c]['deaths_timeline'][i] - countries[c]['deaths_timeline'][i - 1];
					countries[c]['recovered_daily'][i] = countries[c]['recovered_timeline'][i] - countries[c]['recovered_timeline'][i - 1];
				}
			}
		}
	}
	// console.log(countries.World)
	// notify that the data is ready to be used
	jQuery.event.trigger('dataReadyEvent');
}

function generate_line_plot(canvas_elem, title, thickness, color, bgcolor, fill, mdata) {
	// var ctx = $('#active_cases_chart');
	var data = {
		labels: countries.World['dates'],
		datasets: [
			{
				label: title,
				data: mdata,
				backgroundColor: bgcolor,
				borderColor: color,
				borderWidth: thickness,
				fill: fill,
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
			text: title,
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
	var chart = new Chart(canvas_elem, {
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


// |||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||| //

// ******************* DOM/UI related functions *********************** //

function add_button(text, container_elem, button_id, callback_string) {
	// x = document.getElementById(container_id);
	b = document.createElement('button');
	b.id = button_id;
	b.innerHTML = text
	b.setAttribute('onclick', callback_string);
	container_elem.appendChild(b);
	// var b = `<button id="${button_id}" onclick="${callback_string}">${text}</button>`;
	// x.innerHTML += b;
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


// function setup_summary_table_dom(dom_id, summary) {
// 	var x = document.getElementById(dom_id);	
// 	table = `<table id="world_table">` + global_table_headers;
// 	table += "<caption>Data from all the countries affected by COVID-19</caption>";
// 	countries = summary.Countries;
// 	// countries.sort(get_sort_order("NewConfirmed"));
// 	countries.sort(get_sort_order_active_cases());
// 	for (i = countries.length - 1; i >= 0; i--){
// 		data = countries[i];
// 		var row = "<tr>";
// 		row +=
// 			`<th scope="row"><a href=."/view.?country=${data.Slug}">${data.Country}</a></th>
// 			<td>${(data.TotalConfirmed - (data.TotalDeaths+data.TotalRecovered)).toLocaleString()}</td>
// 			<td>${data.NewConfirmed.toLocaleString()}</td>
// 			<td>${data.TotalConfirmed.toLocaleString()}</td>
// 			<td>${data.NewRecovered.toLocaleString()}</td>
// 			<td>${data.TotalRecovered.toLocaleString()}</td>
// 			<td>${data.NewDeaths.toLocaleString()}</td>
// 			<td>${data.TotalDeaths.toLocaleString()}</td>
// 			</tr>`;
// 		table += row;
		
// 	}
// 	table += '</table>';
// 	x.innerHTML += table;
// }




// ||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||| //


// *************************** Utils *********************************** //
//moving average
function moving_average(data, n) {
	console.log(data)
	var out_data = [];
	for (i = 0; i < n-1; i++)
		out_data[i] = 0;
	for (i = n - 1; i < data.length; i++){
		out_data[i] = 0.33 * (data[i] + data[i - 1] + data[i - 2]);
	}
	return out_data;
}


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


// ************************ DATA FETCHING

function fetch_and_prepare_data_JHU() {
	var njobs = 5;
	var progress = document.getElementById('fetching_progress');
	var cnt = 0;
	progress.max = njobs;
	progress.value = 0;

	// fetch daily summary
	var settings = {
		"async": true,
		"crossDomain": true,
		"url": "https://api.covid19api.com/summary",
		"method": "GET",
		"dataType" : "JSON"
	}

	$.ajax(settings).then(
		function (res) {
			country_summaries= [];
			country_summaries['World'] = res.Global;
			// global_summary = res.Global;
			for (i = 0; i < res.Countries.length; i++) {
				let name = country_iso2name[res.Countries[i].CountryCode];
				
				country_summaries[name] = [];
				country_summaries[name]['NewConfirmed'] = res.Countries[i].NewConfirmed;
				country_summaries[name]['TotalConfirmed'] = res.Countries[i].TotalConfirmed;
				country_summaries[name]['NewDeaths'] = res.Countries[i].NewDeaths;
				country_summaries[name]['TotalDeaths'] = res.Countries[i].TotalDeaths;
				country_summaries[name]['NewRecovered'] = res.Countries[i].NewRecovered;
				country_summaries[name]['TotalRecovered'] = res.Countries[i].TotalRecovered;
					
			}
			
			console.log("[OK] FETCH SUMMARY");
			// console.log(country_summaries);
			njobs--;
			if (njobs == 0)
				prepare_data();
	  }, function() {
	    console.log( "[!] FETCH SUMMARY" );
	  });

	// UID_ISO_FIPS_LookUp_Table.csv
	var settings = {
		"crossDomain": true,
		"url": "https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/UID_ISO_FIPS_LookUp_Table.csv",
		"method": "GET",
		"dataType" : "text"
	}
	var cinit = 0;
	$.ajax(settings).then(
		function (res) {
			var data = d3.csvParse(res);
			for (d = 0; d < data.length; d++) {
				if ((typeof (data[d]['Country_Region']) !== 'undefined') && (((data[d]['iso2']) !== ''))) {
					country_name2iso[data[d]['Country_Region']] = data[d]['iso2'];
					country_iso2name[data[d]['iso2']] = data[d]['Country_Region'];
				}
				
			}
			progress.value += 1;
			// console.log(country_name2iso)
			console.log("[OK] FETCHED COUNTRIES ISO NAMES")
			njobs--;
			if (njobs == 0)
				prepare_data();
		}, function() {
		  console.log( "[!] FETCHED COUNTRIES ISO NAMES" );
	});


	var settings = {
		"crossDomain": true,
		"url": "https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_time_series/time_series_covid19_confirmed_global.csv",
		"method": "GET",
		"dataType" : "text"
	}
	var cinit = 0;
	$.ajax(settings).then(
		function (res) {
			var data = d3.csvParse(res);
			for (d = 0; d < data.length; d++) {
				if (typeof(data[d]['Country/Region']) !== 'undefined') {
					if (typeof(countries[data[d]['Country/Region']]) === 'undefined') {
						countries[data[d]['Country/Region']] = [];
					}
					if (typeof(countries[data[d]['Country/Region']]['confirmed']) === 'undefined') {
						countries[data[d]['Country/Region']]["confirmed"] = [];
					}
					countries[data[d]['Country/Region']]['confirmed'][countries[data[d]['Country/Region']]["confirmed"].length] = data[d];
				}
			}
			progress.value += 1;
			console.log("[OK] JHU CONFIRMED_GLOBAL")
			njobs--;
			if (njobs == 0)
				prepare_data();
		}, function() {
			console.log("[!] JHU CONFIRMED_GLOBAL")
	});

	var settings = {
		"crossDomain": true,
		"url": "https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_time_series/time_series_covid19_deaths_global.csv",
		"method": "GET",
		"dataType" : "text"
	}
	
	$.ajax(settings).then(
		function (res) {
			var data = d3.csvParse(res);
			for (d = 0; d < data.length; d++) {
				if (typeof(data[d]['Country/Region']) !== 'undefined') {
					if (typeof(countries[data[d]['Country/Region']]) === 'undefined') {
						countries[data[d]['Country/Region']] = [];
					}
					if (typeof(countries[data[d]['Country/Region']]['deaths']) === 'undefined') {
						countries[data[d]['Country/Region']]["deaths"] = [];
					}
					countries[data[d]['Country/Region']]['deaths'][countries[data[d]['Country/Region']]["deaths"].length] = data[d];
				}
			}
			progress.value += 1;
			console.log("[OK] JHU DEATHS_GLOBAL")
			njobs--;
			if (njobs == 0)
				prepare_data();
		}, function() {
		  console.log( "[!] JHU DEATHS_GLOBAL" );
	});

	var settings = {
		"crossDomain": true,
		"url": "https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_time_series/time_series_covid19_recovered_global.csv",
		"method": "GET",
		"dataType" : "text"
	}
	
	$.ajax(settings).then(
		function (res) {
			var data = d3.csvParse(res);
			for (d = 0; d < data.length; d++) {
				if (typeof(data[d]['Country/Region']) !== 'undefined') {
					if (typeof(countries[data[d]['Country/Region']]) === 'undefined') {
						countries[data[d]['Country/Region']] = [];
					}
					if (typeof(countries[data[d]['Country/Region']]['recovered']) === 'undefined') {
						countries[data[d]['Country/Region']]["recovered"] = [];
					}
					countries[data[d]['Country/Region']]['recovered'][countries[data[d]['Country/Region']]["recovered"].length] = data[d];
				}
			}
			progress.value += 1;
			console.log("[OK] JHU RECOVERED_GLOBAL")
			njobs--;
			if (njobs == 0)
				prepare_data();
		}, function() {
		  console.log( "[!] JHU RECOVERED_GLOBAL" );
	});

	// console.log(countries)
}