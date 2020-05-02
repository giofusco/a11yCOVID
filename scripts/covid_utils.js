//
//
// Created by Giovanni Fusco - The Smith-Kettlewell Eye Research Institute, Copyright 2020
//
// If you are reading this, I'm sorry for you. It's messy and it needs refactoring desperately.
// Can you help? Contact me!
//
//

let api_url = 'https://api.covid19api.com/';
var country_summaries;
var global_summary = [];
var timeline_active = new Object();
var countries = [];
var country_name2iso = []
var country_iso2name = []
var world = [];
var data_ready = false;
var usa_states_data = [];

// how long to play a single data point (in secs)
let sample_length = 0.08

// this function handles the event triggered after getting the data
$(document).bind('dataReadyEvent', function (e) {
	console.log('Data Ready, Generating page');
	document.getElementById('fetching_progress_section').remove(); // remove progress bar because we are done loading
	create_summary_section('World', '', 'main_article');
	setup_country_selection_dom('country_select');
});

function create_about_page(container_id) {
	var container = document.getElementById(container_id);
	var section = document.createElement('section');
	var row1 = document.createElement('div');
	row1.className = 'row';
	var content_cell = document.createElement('div');
	content_cell.className = 'col'
	var padding_cell = document.createElement('div');
	padding_cell.className = 'col'

	content_cell.innerHTML = `
	<h2>About the Project</h2>
	<p>As the world shelters-in-place to slow Coronavirus infections and casualties, 
	governmental agencies and the media turn to graphs and charts to illustrate the need for such action. 
	Access to this data is unavailable to the roughly 39 million people who are blind. 
	This project makes the data sourced by John Hopkins University accessible 
	to people with visual impairments. The plots are automatically described to 
	screen readers and sonified on demand. </p>
	<h3> the author </h3>
	I'm Giovanni Fusco, a researcher at the Rehabilitation Engineering Research Center at the Smith-Kettlewell Eye Research Institute.
	My research focuses on developing tools to reduce accessibity barriers in the STEM field.
	<br>
	More info available on the <a href="https://www.ski.org/project/a11y-covid-19" target="_blank">Smith-Kettlewell Research Institute website</a>
	<br><br>
	
	<h3> funding </h3>
	<p>This project is funded by the Rehabilitation Engineering Research Center: Develop and Evaluate Rehabilitation 
	Technology and Methods for Individuals with Low Vision, Blindness and Multiple Disabilities, Grant Number 90RE5024-01-00  </p>
	`;
	row1.appendChild(content_cell);
	row1.appendChild(padding_cell);
	section.appendChild(row1);
	container.appendChild(section);
}

function list_all_countries(container) {
	var section = document.createElement('section');
	
	var sorted_countries = [];
	for (c in country_name2iso) {
		sorted_countries[sorted_countries.length] = c;
	}
	sorted_countries.sort();
	var row = document.createElement('div');
	row.appendChild(document.createElement('br'))
	var link_to_main = document.createElement('a');
	link_to_main.href = '#';
	link_to_main.addEventListener("click", function () {
		handle_selection('World', '');
	});
	link_to_main.innerText = 'Back to World page';

	row.className = 'row';
	var country_table_cell = document.createElement('div');
	country_table_cell.id = 'countries_table';
	// country_table_cell.appendChild(document.createElement('br'));
	// country_table_cell.appendChild(link_to_main);
	country_table_cell.appendChild(document.createElement('br'));
	country_table_cell.appendChild(document.createElement('br'));
	
	var header = document.createElement('h3');
	header.innerText = 'Table of World Countries';
	country_table_cell.appendChild(header);
	country_table_cell.innerHTML += `<p align='left'><small><em> JHU data are updated once a day around 23:59 (UTC).</em></small></p><ul>`;
	country_table_cell.className = 'col-auto text-center';
	var country_table = document.createElement('table');
	var caption = document.createElement('caption');
	caption.innerText = `This table presents the list of all the countries in the World. For each country, we report new COVID-19 
							infections and deaths since the last update, together with the total number of infections and deaths since the beginning of the pandemic.`;
	country_table.appendChild(caption);
	var table_header = document.createElement('tr');
	table_header.innerHTML = `<th scope='col'> State </th> <th scope='col'>Total Infections</th><th scope='col'>Daily New Infections</th><th scope='col'>Total Deaths</th><th scope='col'>Daily New Deaths</th>`
	country_table.appendChild(table_header);
	for (s in sorted_countries) {
		if (sorted_countries[s].localeCompare('World') != 0) {
			var country_row = document.createElement('tr');
			country_row.innerHTML = `<th scope='row'><a href="#" onClick="handle_selection('${country_name2iso[sorted_countries[s]]}', '')" title="jump to">${sorted_countries[s]}</a></th>
														<td>${countries[sorted_countries[s]].confirmed_timeline.slice(-1)[0].toLocaleString()}</td>
														<td>${countries[sorted_countries[s]].confirmed_daily.slice(-1)[0].toLocaleString()}</td>
														<td>${countries[sorted_countries[s]].deaths_timeline.slice(-1)[0].toLocaleString()}</td>
														<td>${countries[sorted_countries[s]].deaths_daily.slice(-1)[0].toLocaleString()}</td>`;
			country_table.appendChild(country_row);
		}
	}
	country_table_cell.appendChild(country_table);
	var padding_cell = document.createElement('div');
	padding_cell.className = 'col-4 text-center';
	row.appendChild(padding_cell);
	row.appendChild(country_table_cell);
	section.appendChild(row);
	container.appendChild(section);
}

// use country_name = 'World' to get world stats
function create_summary_section(country_code, state_name, container_id) {
	var container = document.getElementById(container_id);
	var section = document.createElement('section');
	var canvas_active = document.createElement('canvas');
	var canvas_daily_new = document.createElement('canvas');
	var canvas_confirmed = document.createElement('canvas');
	var canvas_deaths = document.createElement('canvas');
	
	let country_name = country_iso2name[country_code];
	canvas_active.id = `canvas_active_${country_code}`
	canvas_confirmed.id = `canvas_new_confirmed_${country_code}`
	canvas_deaths.id = `canvas_deaths_confirmed_${country_code}`

	var country_name_label = country_name;
	
	if ((country_code == 'World' || country_code === 'US' || country_code === 'BS') &&  (state_name.localeCompare('') == 0))
		country_name_label = 'the ' + country_name_label;
	
	if (state_name.localeCompare('') != 0)
			country_name_label = state_name + ', ' + country_name2iso[country_name_label];

	section.innerHTML = `  <hr><h2 id='${country_code}'>${country_name_label}</h2><br>`;
	var row1 = document.createElement('div');
	row1.className = 'row';
	var summary_cell = document.createElement('div');
	summary_cell.className = 'col'

	var active_number = 0;
	var total_confirmed = 0;
	var total_recovered = 0;
	var total_deaths = 0;
	
	if ((state_name == undefined) || (state_name.localeCompare('') == 0 )) {
		active_number = countries[country_iso2name[country_code]].active_timeline[countries[country_iso2name[country_code]].active_timeline.length - 1]
		total_confirmed = countries[country_iso2name[country_code]].confirmed_timeline[countries[country_iso2name[country_code]].confirmed_timeline.length - 1]
		total_recovered = countries[country_iso2name[country_code]].recovered_timeline[countries[country_iso2name[country_code]].recovered_timeline.length - 1]
		total_deaths = countries[country_iso2name[country_code]].deaths_timeline[countries[country_iso2name[country_code]].deaths_timeline.length - 1]
	}
	else {
		total_confirmed = countries[country_iso2name[country_code]].States[state_name].confirmed_timeline[countries[country_iso2name[country_code]].confirmed_timeline.length - 1]
		total_deaths = countries[country_iso2name[country_code]].States[state_name].deaths_timeline[countries[country_iso2name[country_code]].deaths_timeline.length - 1]
	}
	var summary_paragraph = document.createElement('p'); 
	if ((state_name == undefined) || (state_name.localeCompare('') == 0)) {
		summary_paragraph.innerHTML = `<h3>Brief</h3>
		<p align='left'><small><em> JHU data are updated once a day around 23:59 (UTC).</em></small></p><ul>`;

		if (active_number != 1)
			summary_paragraph.innerHTML += `<li>Active cases: ${active_number.toLocaleString()}`;
		else
			summary_paragraph.innerHTML += `<li>Active cases: 1`;
	
		summary_paragraph.innerHTML += `</li>
								<li>Total number of COVID-19 <strong>infections</strong> since the start of the pandemic: ${total_confirmed.toLocaleString()}. </li>
								<li>Total number of <strong>recoveries</strong> registered since the start of the pandemic: ${total_recovered.toLocaleString()}. </li>
								<li>Total number of <strong>deaths</strong> reported since the start of the pandemic: ${total_deaths.toLocaleString()}. </li>
								</ul>`;
		if ('US' == country_name2iso[country_name])
			summary_paragraph.innerHTML += `<br><p align='center'><a href="#us_states_table">Jump to States list</a></p>`
	}

	else {
		summary_paragraph.innerHTML = `<h3>Brief</h3>
		<p align='left'><small><em> JHU data are updated once a day around 23:59 (UTC).</em></small></p><ul>`;
	
		summary_paragraph.innerHTML += `</li>
								<li>Total number of COVID-19 <strong>infections</strong> since the start of the pandemic: ${total_confirmed.toLocaleString()}. </li>
								<li>Total number of <strong>deaths</strong> reported since the start of the pandemic: ${total_deaths.toLocaleString()}. </li>
								</ul>`;
		if ('US' == country_name2iso[country_name])
			summary_paragraph.innerHTML += `<br><br><p align='left'><a href="#us_states_table">Jump to States list</a></p>`
	}

	summary_cell.appendChild(summary_paragraph);
	row1.appendChild(summary_cell);

	if (state_name.localeCompare('') == 0) {
	
		active_tml_stats = get_data_stats(countries[country_name]['active_timeline'], country_name);
		var active_tml_caption = `The values range from ${active_tml_stats.min_val.toLocaleString()} on 
									${active_tml_stats.min_key.toLocaleString()} 
		to ${active_tml_stats.max_val.toLocaleString()} on ${active_tml_stats.max_key.toLocaleString()}.`;
		if (active_tml_stats.min_val != active_tml_stats.first_val)
			active_tml_caption += `The first ${active_tml_stats.first_val.toLocaleString()} active cases were recorded on 
									${active_tml_stats.first_key.toLocaleString()}`


		var active_plot_cell = document.createElement('div');
		active_plot_cell.className = 'col-lg text-center';
		var plot_header = document.createElement('h3');
		plot_header.innerText = 'Plot - Active Cases of COVID-19 in ' + country_name_label;
		active_plot_cell.append(plot_header);

		canvas_active.setAttribute('aria-label', `This plot shows the evolution of the number of active cases of COVID-19 
									from ${countries[country_name].dates[0].toLocaleString()} to the latest update.`);
		canvas_active.innerHTML = `<p role="region" aria-live="polite"
									id="active_cases_chart_fallback">${active_tml_caption}}</p>`;
		
		generate_plot(canvas_active, `Active CODVID-19 Cases in ${country_name_label}`, 1, 'black', 'salmon', false, countries[country_name]['active_timeline']);
		active_plot_cell.appendChild(document.createElement('br'));
		active_plot_cell.appendChild(canvas_active);
		active_plot_cell.appendChild(document.createElement('br'));
		add_button(`Sonify ${country_name_label} Active Cases Plot`, active_plot_cell, `sonify_active_${country_name}_button_id`, `sonify(countries['${country_name}']['active_timeline'], 220, 3);`);
		active_plot_cell.appendChild(document.createElement('br'));
		active_plot_cell.appendChild(document.createElement('br'));
		
		row1.appendChild(active_plot_cell);
		section.appendChild(row1);
		var row2 = document.createElement('div');
		row2.className = 'row';

		if (country_name !== 'World') {
			confirmed_stats = get_data_stats(countries[country_name]['confirmed_daily'], country_name);
			deaths_stats = get_data_stats(countries[country_name]['deaths_daily'], country_name);

			var confirmed_caption = `The values range from ${confirmed_stats.min_val.toLocaleString()} on ${confirmed_stats.min_key.toLocaleString()} 
			to ${confirmed_stats.max_val.toLocaleString()} on ${confirmed_stats.max_key.toLocaleString()}.`;
			if (confirmed_stats.min_val != confirmed_stats.first_val)
				confirmed_caption += `The first ${confirmed_stats.first_val.toLocaleString()} infections were recorded on ${confirmed_stats.first_key.toLocaleString()}`;

			var deaths_caption = `The values range from ${deaths_stats.min_val.toLocaleString()} on ${deaths_stats.min_key.toLocaleString()} 
			to ${deaths_stats.max_val.toLocaleString()} on ${deaths_stats.max_key.toLocaleString()}.}`;
			if (deaths_stats.min_val != deaths_stats.first_val)
				deaths_caption += `The first ${deaths_stats.first_val.toLocaleString()} deaths were recorded on ${deaths_stats.first_key.toLocaleString()}`;

			var confirmed_plot_cell = document.createElement('div');
			confirmed_plot_cell.className = 'col-sm text-center';
			
			canvas_confirmed.setAttribute('aria-label', `This plot shows the total number of new COVID-19 infections
			from the beginning of the pandemic on ${countries[country_name].dates[0].toLocaleString()} to the latest update.`);
			
			canvas_confirmed.innerHTML = `<p role="region" aria-live="polite"
				id="confirmed_cases_chart_fallback"> ${confirmed_caption} </p>`;
			generate_plot(canvas_confirmed, `Total CODVID-19 infections in  ${country_name_label}`, 1, 'black', 'teal', false,
				countries[`${country_name}`]['confirmed_timeline']);
			
			var plot_header_confirmed = document.createElement('h3');
			plot_header_confirmed.innerText = 'Plot - Total Confirmed Cases of COVID-19 in ' + country_name_label;
			confirmed_plot_cell.append(plot_header_confirmed);
			
			confirmed_plot_cell.appendChild(canvas_confirmed);
			confirmed_plot_cell.appendChild(document.createElement('br'));
			add_button(`Sonify ${country_name_label} Total Confirmed Cases Plot`, confirmed_plot_cell, `sonify_confirmed_${country_name}_button_id`,
				`sonify(countries['${country_name}']['confirmed_timeline'], 220, 3);`);
			confirmed_plot_cell.appendChild(document.createElement('br'));
			confirmed_plot_cell.appendChild(document.createElement('br'));
			
			var deaths_plot_cell = document.createElement('div');
			deaths_plot_cell.className = 'col-sm text-center';
			
			canvas_deaths.setAttribute('aria-label', `This plot shows the total number of COVID-19 
			deaths from the beginning of the pandemic on ${countries[country_name].dates[0].toLocaleString()} to the latest update.`);
			canvas_deaths.innerHTML = `<p role="region" aria-live="polite"
				id="confirmed_cases_chart_fallback">${deaths_caption}</p>`;

			generate_plot(canvas_deaths, `Total CODVID-19 deaths in  ${country_name}`, 1, 'black', 'gray', false, countries[country_name]['deaths_timeline']);

			var plot_header_deaths = document.createElement('h3');
			plot_header_deaths.innerText = 'Plot - Total COVID-19 Deaths in ' + country_name_label;
			deaths_plot_cell.append(plot_header_deaths);

			deaths_plot_cell.appendChild(canvas_deaths);
			deaths_plot_cell.appendChild(document.createElement('br'));
			add_button(`Sonify ${country_name} Total Deaths Plot`, deaths_plot_cell, `sonify_deaths_${country_name}_button_id`,
				`sonify(countries['${country_name}']['deaths_timeline'], 220, 3);`);

			row2.appendChild(confirmed_plot_cell);
			row2.appendChild(deaths_plot_cell);

			section.appendChild(row2);
			var padding_cell = document.createElement('div');
			padding_cell.className = 'col-4 text-center';
			section.appendChild(padding_cell);
			var link_cell = document.createElement('div');
			link_cell.innerHTML = `<p align='center'><a href="#" onClick="handle_selection('World', '')" title="jump to">Table of Countries</a></p>`;
			if (country_code.localeCompare('US') != 0)
				section.appendChild(link_cell);

			
		}
		else {
			var padding_cell = document.createElement('div');
			padding_cell.className = 'col-2 text-center';
			section.appendChild(padding_cell);
			var countries_cell = document.createElement('div');
			countries_cell.className = 'col-sm text-center';
			countries_cell.id = 'table_container';
			list_all_countries(countries_cell);
			section.appendChild(countries_cell);
		}
	}
	else { // handle state plots

		daily_new_tml_stats = get_data_stats(countries[country_name].States[state_name]['confirmed_daily'], country_name);
		var daily_new_tml_caption = `The values on tha vertical axis range from ${daily_new_tml_stats.min_val.toLocaleString()} recorded on 
									${daily_new_tml_stats.min_key.toLocaleString()} 
		to ${daily_new_tml_stats.max_val.toLocaleString()} on ${daily_new_tml_stats.max_key.toLocaleString()}.`;
		// if (daily_new_tml_stats.min_val != daily_new_tml_stats.first_val)
			// daily_new_tml_caption += `The first ${daily_new_tml_stats.first_val.toLocaleString()} daily_new cases were recorded on 
									// ${daily_new_tml_stats.first_key.toLocaleString()}`


		var daily_new_plot_cell = document.createElement('div');
		daily_new_plot_cell.className = 'col-lg text-center';
		var plot_header = document.createElement('h3');
		plot_header.innerText = 'Plot - Total COVID-19 Infections Over Time in ' + country_name_label;
		daily_new_plot_cell.append(plot_header);

		canvas_daily_new.setAttribute('aria-label', `This plot shows the evolution of the total number of COVID-19 cases 
									from the beginning of the pandemic on ${countries[country_name].dates[0].toLocaleString()} to the latest update.`);
		canvas_daily_new.innerHTML = `<p role="region" aria-live="polite"
									id="daily_new_cases_chart_fallback">${daily_new_tml_caption}}</p>`;
		
		generate_plot(canvas_daily_new, `Total CODVID-19 Cases in ${country_name_label}`, 1, 'black', 'rgba(125, 100, 45, 0.9)', false, countries[country_name].States[state_name]['confirmed_timeline']);
		daily_new_plot_cell.appendChild(document.createElement('br'));
		daily_new_plot_cell.appendChild(canvas_daily_new);
		daily_new_plot_cell.appendChild(document.createElement('br'));
		add_button(`Sonify Daily New Cases Plot`, daily_new_plot_cell, `sonify_daily_new_${country_name}_button_id`, `sonify(moving_average(countries['${country_name}'].States['${state_name}']['confirmed_timeline'], 3), 220, 3);`);
		daily_new_plot_cell.appendChild(document.createElement('br'));
		daily_new_plot_cell.appendChild(document.createElement('br'));
		
		row1.appendChild(daily_new_plot_cell);


		section.appendChild(row1);
		var row2 = document.createElement('div');
		row2.className = 'row';

		confirmed_stats = get_data_stats(countries[country_name]['confirmed_daily'], country_name);
		deaths_stats = get_data_stats(countries[country_name]['deaths_daily'], country_name);

		var confirmed_caption = `The values range from ${confirmed_stats.min_val.toLocaleString()} on ${confirmed_stats.min_key.toLocaleString()} 
		to ${confirmed_stats.max_val.toLocaleString()} on ${confirmed_stats.max_key.toLocaleString()}.`;
		if (confirmed_stats.min_val != confirmed_stats.first_val)
			confirmed_caption += `The first ${confirmed_stats.first_val.toLocaleString()} infections were recorded on ${confirmed_stats.first_key.toLocaleString()}`;

		var deaths_caption = `The values range from ${deaths_stats.min_val.toLocaleString()} on ${deaths_stats.min_key.toLocaleString()} 
		to ${deaths_stats.max_val.toLocaleString()} on ${deaths_stats.max_key.toLocaleString()}.}`;
		if (deaths_stats.min_val != deaths_stats.first_val)
			deaths_caption += `The first ${deaths_stats.first_val.toLocaleString()} deaths were recorded on ${deaths_stats.first_key.toLocaleString()}`;

		var confirmed_plot_cell = document.createElement('div');
		confirmed_plot_cell.className = 'col-sm text-center';
		
		canvas_confirmed.setAttribute('aria-label', `This plot shows the daily number of new COVID-19 infections
		from ${countries[country_name].dates[0].toLocaleString()} to the latest update.`);
		
		canvas_confirmed.innerHTML = `<p role="region" aria-live="polite"
			id="confirmed_cases_chart_fallback"> ${confirmed_caption} </p>`;
		generate_plot(canvas_confirmed, `Daily new CODVID-19 infections in  ${country_name_label}`, 1, 'black', 'teal', false,
			countries[`${country_name}`].States[state_name]['confirmed_daily']);
		
		var plot_header_confirmed = document.createElement('h3');
		plot_header_confirmed.innerText = 'Plot - Daily New Cases of COVID-19 in ' + country_name_label;
		confirmed_plot_cell.append(plot_header_confirmed);
		
		confirmed_plot_cell.appendChild(canvas_confirmed);
		confirmed_plot_cell.appendChild(document.createElement('br'));
		add_button(`Sonify Daily New Cases Plot`, confirmed_plot_cell, `sonify_confirmed_${country_name}_button_id`,
			`sonify(countries['${country_name}'].States['${state_name}']['confirmed_daily'], 220, 1);`);
		confirmed_plot_cell.appendChild(document.createElement('br'));
		confirmed_plot_cell.appendChild(document.createElement('br'));
		
		var deaths_plot_cell = document.createElement('div');
		deaths_plot_cell.className = 'col-sm text-center';
		
		canvas_deaths.setAttribute('aria-label', `This plot shows the total number of COVID-19 
		deaths from ${countries[country_name].dates[0].toLocaleString()} to the latest update.`);
		canvas_deaths.innerHTML = `<p role="region" aria-live="polite"
			id="confirmed_cases_chart_fallback">${deaths_caption}</p>`;

		generate_plot(canvas_deaths, `Total CODVID-19 deaths in  ${country_name}`, 1, 'black', 'gray', false, countries[country_name].States[state_name]['deaths_timeline']);

		var plot_header_deaths = document.createElement('h3');
		plot_header_deaths.innerText = 'Plot - Total COVID-19 Deaths in ' + country_name_label;
		deaths_plot_cell.append(plot_header_deaths);

		deaths_plot_cell.appendChild(canvas_deaths);
		deaths_plot_cell.appendChild(document.createElement('br'));
		add_button(`Sonify Total Deaths Plot`, deaths_plot_cell, `sonify_deaths_${country_name}_button_id`,
			`sonify(countries['${country_name}'].States['${state_name}']['deaths_timeline'], 220, 3);`);

		row2.appendChild(confirmed_plot_cell);
		row2.appendChild(deaths_plot_cell);
		section.appendChild(row2);
	}


	if ('US' == country_name2iso[country_name]) {
		// create row for table of states
		var row3 = document.createElement('div');
		row3.appendChild(document.createElement('br'))
		var link_to_main = document.createElement('a');
		link_to_main.href = '#';
		link_to_main.addEventListener("click", function () {
			handle_selection('US', '');
		});
		link_to_main.innerText = 'Back to USA main page';

		row3.className = 'row';
		var states_table_cell = document.createElement('div');
		states_table_cell.id = 'us_states_table';
		states_table_cell.appendChild(document.createElement('br'));
		states_table_cell.appendChild(link_to_main);
		states_table_cell.appendChild(document.createElement('br'));
		states_table_cell.appendChild(document.createElement('br'));
		
		var header = document.createElement('h3');
		header.innerText = 'Table of States';
		states_table_cell.appendChild(header);
		states_table_cell.className = 'col-auto text-center';
		var states_table = document.createElement('table');
		var caption = document.createElement('caption');
		caption.innerText = `This table presents the list of all the states in the USA. For each state, we report new COVID-19 
								infections and deaths since the last update, together with the total number of infections and deaths since the beginning of the pandemic.`;
		states_table.appendChild(caption);
		var table_header = document.createElement('tr');
		table_header.innerHTML = `<th scope='col'> State </th> <th scope='col'>Total Infections</th><th scope='col'>Daily New Infections</th><th scope='col'>Total Deaths</th><th scope='col'>Daily New Deaths</th>`
		states_table.appendChild(table_header);
		for (s in countries[country_name].States) {
			var state_row = document.createElement('tr');
			state_row.innerHTML = `<th scope='row'><a href="#" onClick="handle_selection('US', '${s}')" title="jump to">${s}</a></th><td>${countries[country_name].States[s].confirmed_timeline.slice(-1)[0].toLocaleString()}</td>
															<td>${countries[country_name].States[s].confirmed_daily.slice(-1)[0].toLocaleString()}</td>
															<td>${countries[country_name].States[s].deaths_timeline.slice(-1)[0].toLocaleString()}</td>
															<td>${countries[country_name].States[s].deaths_daily.slice(-1)[0].toLocaleString()}</td>`;
			states_table.appendChild(state_row);
		}
		states_table_cell.appendChild(states_table);
		var padding_cell = document.createElement('div');
		padding_cell.className = 'col-4 text-center';
		row3.appendChild(padding_cell);
		row3.appendChild(states_table_cell);
		section.appendChild(row3);
	}
	
	section.id = `${country_code}_summary`;
	
	container.appendChild(section);
	container.appendChild(document.createElement('br'));
	container.appendChild(document.createElement('br'));
}

function sonify(data, f0, n_octaves) {
	let f_max = f0 * 2 ** n_octaves;
	var d_max = -1;
	var d_min = 1e9;
	var values = Object.values(data);
	
	for (v = 0; v < values.length - 1; v++) {
		if (values[v] > d_max) 
			d_max = values[v];
		if (values[v] < d_min) 
			d_min = values[v];
	}

	var frequencies = [];
	for (v = 0; v < values.length; v++) {
		frequencies[v] = (((data[v] - d_min) * (f_max - f0)) / (d_max - d_min)) + f0;
	}
	playPulse(frequencies);
}

function playPulse(freqs) {
	// for cross browser compatibility
	var audioCtx = new (window.AudioContext || window.webkitAudioContext)();
	var gainNode = audioCtx.createGain();
	
  	gainNode.gain.minValue = 0;
	gainNode.gain.maxValue = 1;
	gainNode.gain.value = 0.25;

	var oscillator = audioCtx.createOscillator();
	oscillator.type = 'sine';
	gainNode.gain.exponentialRampToValueAtTime(
		0.00001, audioCtx.currentTime +  freqs.length * sample_length
	)
	
	for (i = 0; i < freqs.length; i++) {
		oscillator.frequency.setValueAtTime(freqs[i], audioCtx.currentTime + i * sample_length);
		gainNode.gain.setValueAtTime(0.25, audioCtx.currentTime + i * sample_length);
	}

	oscillator.connect(gainNode).connect(audioCtx.destination);

	oscillator.start();
	oscillator.stop(audioCtx.currentTime + freqs.length * sample_length);
}
		
function prepare_data() {
	console.log('CRUNCHING DATA...')
	if (!data_ready) {
		data_ready = true;
		for (c in countries) {
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
			countries[c]['deaths_daily'] = [];

			for (i = 0; i < countries[c]['dates'].length; i++) {
				countries[c]['confirmed_timeline'][i] = 0;
				countries[c]['deaths_timeline'][i] = 0;
				countries[c]['recovered_timeline'][i] = 0;
				countries[c]['active_timeline'][i] = 0;
				countries[c]['confirmed_daily'][i] = 0;
				countries[c]['deaths_daily'][i] = 0;
				countries[c]['recovered_daily'][i] = 0;
			}
			// accumulate cases across multiple regions, if any
			for (i = 0; i < confirmed.length; i++) {
				var keys = (countries[c]['dates']);
				for (k in keys) {
				
					countries[c]['confirmed_timeline'][k] += Number(confirmed[i][keys[k]]);
					countries[c]['deaths_timeline'][k] += Number(deaths[i][keys[k]]);
					if (recovered[i] != undefined)
						countries[c]['recovered_timeline'][k] += Number(recovered[i][keys[k]]);
				}
			}
			var keys = (countries[c]['dates']);
			for (k in keys) {
				countries[c]['active_timeline'][k] += countries[c]['confirmed_timeline'][k] -
					(countries[c]['deaths_timeline'][k] + countries[c]['recovered_timeline'][k]);
			}

			if (c == 'US') {
				prepare_US_states();
			}
		}
		countries['World'] = [];
		countries['World']['dates'] = countries['Italy']['dates'];
		countries['World']['confirmed_timeline'] = [];
		countries['World']['deaths_timeline'] = [];
		countries['World']['recovered_timeline'] = [];
		countries['World']['active_timeline'] = [];

		//init arrays
		for (i = 0; i < countries['World']['dates'].length; i++) {
			countries['World']['confirmed_timeline'][i] = 0;
			countries['World']['deaths_timeline'][i] = 0;
			countries['World']['recovered_timeline'][i] = 0;
			countries['World']['active_timeline'][i] = 0;
		}
		for (c in countries) {
			// console.log(c)
			// console.log(countries['World']['dates'])
			for (i = 0; i < countries['World']['dates'].length; i++) {
				if (c !== 'World') {
					countries['World']['confirmed_timeline'][i] += countries[c]['confirmed_timeline'][i];
					countries['World']['deaths_timeline'][i] += countries[c]['deaths_timeline'][i];
					countries['World']['recovered_timeline'][i] += countries[c]['recovered_timeline'][i];
					countries['World']['active_timeline'][i] += countries[c]['active_timeline'][i];
					if (i == 0) {
						// console.log(countries[c]['confirmed_daily'])
						countries[c]['confirmed_daily'][i] = countries[c]['confirmed_timeline'][i];
						countries[c]['deaths_daily'][i] = countries[c]['deaths_timeline'][i];
						countries[c]['recovered_daily'][i] = countries[c]['recovered_timeline'][i];
					}
					else {
						countries[c]['confirmed_daily'][i] = clip_to_zero(countries[c]['confirmed_timeline'][i] - countries[c]['confirmed_timeline'][i - 1]);
						countries[c]['deaths_daily'][i] = clip_to_zero(countries[c]['deaths_timeline'][i] - countries[c]['deaths_timeline'][i - 1]);
						countries[c]['recovered_daily'][i] = clip_to_zero(countries[c]['recovered_timeline'][i] - countries[c]['recovered_timeline'][i - 1]);
					}
				}
			}
		}
		let us = 'United States of America';
		country_name2iso[us] = 'US';
		country_iso2name['US'] = us;
		countries[us] = countries['US'];
		countries['South Korea'] = countries['Korea, South'];
		country_iso2name['KR'] = 'South Korea';
		country_name2iso['South Korea'] = 'KR';
		delete country_name2iso['Korea, South'];
		delete country_name2iso['US'];
		delete countries['US'];
		delete countries['Korea, South'];
		// delete countries['Iran'];
		console.log('CRUNCHING DATA... OK!');
	}

	// notify that the data is ready to be used
	jQuery.event.trigger('dataReadyEvent');
}

function prepare_US_states() {
	var keys = (countries['US']['dates']);

	for (s in countries['US'].States) {
		countries['US'].States[s]['confirmed_timeline'] = [];
		countries['US'].States[s]['confirmed_daily'] = [];
		countries['US'].States[s]['deaths_timeline'] = [];
		countries['US'].States[s]['deaths_daily'] = [];
		for (i = 0; i < countries['US']['dates'].length; i++) {
			countries['US'].States[s]['confirmed_timeline'][i] = 0;
			countries['US'].States[s]['deaths_timeline'][i] = 0;
			countries['US'].States[s]['confirmed_daily'][i] = 0;
			countries['US'].States[s]['deaths_daily'][i] = 0;
		}
		for (c = 0; c < Object.keys(countries['US'].States[s].Counties).length; c++) {
			var county_name = Object.keys(countries['US'].States[s].Counties)[c];
			countries['US'].States[s].Counties[county_name]['confirmed_timeline'] = [];
			countries['US'].States[s].Counties[county_name]['confirmed_daily'] = [];
			countries['US'].States[s].Counties[county_name]['deaths_timeline'] = [];
			countries['US'].States[s].Counties[county_name]['deaths_daily'] = [];
			for (i = 0; i < countries['US'].dates.length; i++) {
				countries['US'].States[s].Counties[county_name]['confirmed_timeline'][i] = 0;
				countries['US'].States[s].Counties[county_name]['deaths_timeline'][i] = 0;
				countries['US'].States[s].Counties[county_name]['confirmed_daily'][i] = 0;
				countries['US'].States[s].Counties[county_name]['deaths_daily'][i] = 0;
			}
		}
	}
	

	for (s in countries['US'].States) {
		if (Object.keys(countries['US'].States[s].Counties).length > 0){
			for (c = 0; c < Object.keys(countries['US'].States[s].Counties).length; c++) {
				// console.log('>' + c + ', ' + Object.keys(countries['US'].States[s].Counties)[c])
				let county_name = Object.keys(countries['US'].States[s].Counties)[c];
				// create timeline and daily for each county
				let confirmed = countries['US'].States[s].Counties[county_name].confirmed;
				let deaths = countries['US'].States[s].Counties[county_name].deaths;
				
				for (i = 0; i < countries['US'].dates.length; i++) {
					// for (k in keys) {
						countries['US'].States[s].Counties[county_name]['confirmed_timeline'][i] += Number(confirmed[keys[i]]);
						countries['US'].States[s].Counties[county_name]['deaths_timeline'][i] += Number(deaths[keys[i]]);
						countries['US'].States[s]['confirmed_timeline'][i] += Number(confirmed[keys[i]]);
						countries['US'].States[s]['deaths_timeline'][i] += Number(deaths[keys[i]]);
					// }
					if (i == 0) {
						// console.log(countries[c]['confirmed_daily'])
						countries['US'].States[s].Counties[county_name]['confirmed_daily'][i] = countries['US'].States[s].Counties[county_name]['confirmed_timeline'][i];
						countries['US'].States[s].Counties[county_name]['deaths_daily'][i] = countries['US'].States[s].Counties[county_name]['deaths_timeline'][i];
						countries['US'].States[s]['confirmed_daily'][i] = countries['US'].States[s].Counties[county_name]['confirmed_timeline'][i];
						countries['US'].States[s]['deaths_daily'][i] = countries['US'].States[s].Counties[county_name]['deaths_timeline'][i];
					}
					else {
						countries['US'].States[s].Counties[county_name]['confirmed_daily'][i] += clip_to_zero(countries['US'].States[s].Counties[county_name]['confirmed_timeline'][i] - countries['US'].States[s].Counties[county_name]['confirmed_timeline'][i - 1]);
						countries['US'].States[s].Counties[county_name]['deaths_daily'][i] += clip_to_zero(countries['US'].States[s].Counties[county_name]['deaths_timeline'][i] - countries['US'].States[s].Counties[county_name]['deaths_timeline'][i - 1]);
						countries['US'].States[s]['confirmed_daily'][i] += clip_to_zero(countries['US'].States[s].Counties[county_name]['confirmed_timeline'][i] - countries['US'].States[s].Counties[county_name]['confirmed_timeline'][i - 1]);
						countries['US'].States[s]['deaths_daily'][i] += clip_to_zero(countries['US'].States[s].Counties[county_name]['deaths_timeline'][i] - countries['US'].States[s].Counties[county_name]['deaths_timeline'][i - 1]);
					}
				}
			}
				// sum up timelines and assign to state
		}
		else {
			let confirmed = countries['US'].States[s].confirmed;
			// console.log(confirmed)
			let deaths = countries['US'].States[s].deaths;
			for (i = 0; i < countries['US'].dates.length; i++) {
				// console.log("XX " + i);
				
				for (k in keys) {
					countries['US'].States[s]['confirmed_timeline'][i] += Number(confirmed[keys[i]]);
					countries['US'].States[s]['deaths_timeline'][i] += Number(deaths[keys[i]]);
				}
				if (i == 0) {
					// console.log(countries[c]['confirmed_daily'])
					countries['US'].States[s]['confirmed_daily'][i] = countries['US'].States[s]['confirmed_timeline'][i];
					countries['US'].States[s]['deaths_daily'][i] = countries['US'].States[s]['deaths_timeline'][i];
				}
				else {
					countries['US'].States[s]['confirmed_daily'][i] += clip_to_zero(countries['US'].States[s]['confirmed_timeline'][i] - countries['US'].States[s]['confirmed_timeline'][i - 1]);
					countries['US'].States[s]['deaths_daily'][i] += clip_to_zero(countries['US'].States[s]['deaths_timeline'][i] - countries['US'].States[s]['deaths_timeline'][i - 1]);
				}
			}
		}
	}
}

function generate_plot(canvas_elem, title, thickness, color, bgcolor, fill, mdata) {
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
			fontSize: 22,
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
		type: "bar",
		data: data,
		options: options
	});
	
}

// /////////////////////////////////////////////////////////////////////////////////////// \\
// /////////////////////////////////////////////////////////////////////////////////////// \\
// /////////////////////////////////////////////////////////////////////////////////////// \\
// /////////////////////////////////////////////////////////////////////////////////////// \\
// ******************************** DOM/UI ************************************************ \\
/ //////////////////////////////////////////////////////////////////////////////////////// \\
// /////////////////////////////////////////////////////////////////////////////////////// \\
// /////////////////////////////////////////////////////////////////////////////////////// \\
// /////////////////////////////////////////////////////////////////////////////////////// \\

function add_button(text, container_elem, button_id, callback_string) {
	// x = document.getElementById(container_id);
	b = document.createElement('button');
	b.id = button_id;
	b.innerHTML = text
	b.setAttribute('onclick', callback_string);
	container_elem.appendChild(b);
}

function setup_country_selection_dom(select_id) {
	var sorted_countries = [];
	for (c in country_name2iso) {
		sorted_countries[sorted_countries.length] = c;
	}
	sorted_countries.sort();
	var x = document.getElementById(select_id);
	for (c in sorted_countries) {
		var option = document.createElement("option");
		option.text = sorted_countries[c];
		option.value = country_name2iso[sorted_countries[c]];
		x.add(option);
	}
}

// /////////////////////////////////////////////////////////////////////////////////////// \\
// /////////////////////////////////////////////////////////////////////////////////////// \\
// /////////////////////////////////////////////////////////////////////////////////////// \\
// /////////////////////////////////////////////////////////////////////////////////////// \\
// ******************************** UTILS ************************************************ \\
/ //////////////////////////////////////////////////////////////////////////////////////// \\
// /////////////////////////////////////////////////////////////////////////////////////// \\
// /////////////////////////////////////////////////////////////////////////////////////// \\
// /////////////////////////////////////////////////////////////////////////////////////// \\


function clip_to_zero(n) {
	if (n < 0)
		return 0;
	else return n;
}

function formatAMPM(date) {
	var hours = date.getHours();
	var minutes = date.getMinutes();
	var ampm = hours >= 12 ? 'pm' : 'am';
	hours = hours % 12;
	hours = hours ? hours : 12; // the hour '0' should be '12'
	minutes = minutes < 10 ? '0'+minutes : minutes;
	var strTime = hours + ':' + minutes + ' ' + ampm;
	return strTime;
  }

const isToday = (in_date) => {
	const today = new Date()
	return (in_date.getDate() == today.getDate() &&
		in_date.getMonth() == today.getMonth() &&
		in_date.getFullYear() == today.getFullYear());
  }

//moving average
function moving_average(data, n) {
	var out_data = [];
	for (i = 0; i < n-1; i++)
		out_data[i] = 0;
	for (i = n - 1; i < data.length; i++){
		out_data[i] = 0.33 * (data[i] + data[i - 1] + data[i - 2]);
	}
	return out_data;
}

function get_data_stats(data, country_name) {
	res = [];
	var max_val = -1;
	var min_val = 1e9;
	var first_val = 0;
	var first_key;
	var first_non_zero = true;
	var min_key;
	var max_key;
	var values = Object.values(data);
	
	for (v = 0; v < values.length - 1; v++) {
		if (values[v] > 0 && first_non_zero) {
			first_non_zero = false;
			first_val = values[v];
			first_key = countries[country_name].dates[v];
		}
		if (values[v] > max_val) {
			max_val = values[v];
			max_key = countries[country_name].dates[v];
		}
		if (values[v] < min_val) {
			min_val = values[v];
			min_key = countries[country_name].dates[v];
		}
	}
	res.min_val = min_val;
	res.min_key = min_key;
	res.max_val = max_val;
	res.max_key = max_key;
	res.first_val = first_val;
	res.first_key = first_key;
	return res;
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


// /////////////////////////////////////////////////////////////////////////////////////// \\
// /////////////////////////////////////////////////////////////////////////////////////// \\
// /////////////////////////////////////////////////////////////////////////////////////// \\
// /////////////////////////////////////////////////////////////////////////////////////// \\
// ******************************** DATA FETCHING **************************************** \\
/ //////////////////////////////////////////////////////////////////////////////////////// \\
// /////////////////////////////////////////////////////////////////////////////////////// \\
// /////////////////////////////////////////////////////////////////////////////////////// \\
// /////////////////////////////////////////////////////////////////////////////////////// \\


function fetch_and_prepare_data_JHU() {
	var njobs = 6;
	var progress = document.getElementById('fetching_progress');
	var cnt = 0;
	progress.max = njobs;
	progress.value = 0;

	var settings = {
		"crossDomain": true,
		"url": "https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/UID_ISO_FIPS_LookUp_Table.csv",
		"method": "GET",
		"dataType" : "text"
	}
	$.ajax(settings).then(
		function (res) {
			var data = d3.csvParse(res);
			country_name2iso['World'] = 'World';
			country_iso2name['World'] = 'World';
			for (i = 0; i < data.length; i++){
				country_name2iso[data[i]['Country_Region']] = data[i]['iso2'];
				country_iso2name[data[i]['iso2']] = data[i]['Country_Region'];
			}

			progress.value += 1;
			console.log("[OK] JHU ISO_TABLE")
			
			njobs--;
			if (njobs == 0)
				prepare_data();
		}, function() {
			console.log("[!] JHU ISO_TABLE")
	});
	

	var settings = {
		"crossDomain": true,
		"url": "https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_time_series/time_series_covid19_confirmed_global.csv",
		"method": "GET",
		"dataType" : "text"
	}
	$.ajax(settings).then(
		function (res) {
			var data = d3.csvParse(res);
			
			for (d = 0; d < data.length; d++) {
				if (typeof (data[d]['Country/Region']) !== 'undefined') {
					// is it the first time we see this country? if so, initialize the array
					if (typeof (countries[data[d]['Country/Region']]) === 'undefined') {
						countries[data[d]['Country/Region']] = [];
						countries[data[d]['Country/Region']]['States'] = [];
					}
					
					// country-wide data
					if (typeof(countries[data[d]['Country/Region']]['confirmed']) === 'undefined'){
						countries[data[d]['Country/Region']]["confirmed"] = [];
					}
					if (data[d]['Province/State'] !== ''){
						if ((countries[data[d]['Country/Region']]['States'][data[d]['Province/State']] === undefined)) {
							// console.log(countries[data[d]['Country/Region']]['States'][data[d]['Province/State']].length)
							countries[data[d]['Country/Region']]['States'][data[d]['Province/State']] = [];
						}
						if (typeof (countries[data[d]['Country/Region']]['States'][data[d]['Province/State']]['confirmed'] === 'undefined')) {
							countries[data[d]['Country/Region']]['States'][data[d]['Province/State']]['confirmed'] = [];
						}
					}

					countries[data[d]['Country/Region']]['confirmed'][countries[data[d]['Country/Region']]["confirmed"].length] = data[d];
					
					if ( (data[d]['Province/State']) !== '') {
						countries[data[d]['Country/Region']]['States'][data[d]['Province/State']]['confirmed'][countries[data[d]['Country/Region']]['States'][data[d]['Province/State']]['confirmed'].length] = data[d];
					}
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
				if (typeof (data[d]['Country/Region']) !== 'undefined') {
					// is it the first time we see this country? if so, initialize the array
					if (typeof (countries[data[d]['Country/Region']]) === 'undefined') {
						countries[data[d]['Country/Region']] = [];
						countries[data[d]['Country/Region']]['States'] = [];
					}
					
					// country-wide data
					if (typeof(countries[data[d]['Country/Region']]['deaths']) === 'undefined'){
						countries[data[d]['Country/Region']]["deaths"] = [];
					}
					if (data[d]['Province/State'] !== ''){
						if ( (countries[data[d]['Country/Region']]['States'][data[d]['Province/State']] === undefined)) {
							countries[data[d]['Country/Region']]['States'][data[d]['Province/State']] = [];
						}
						if ((countries[data[d]['Country/Region']]['States'][data[d]['Province/State']]['deaths'] === undefined)) {
							countries[data[d]['Country/Region']]['States'][data[d]['Province/State']]['deaths'] = [];
						}
					}

					countries[data[d]['Country/Region']]['deaths'][countries[data[d]['Country/Region']]["deaths"].length] = data[d];
					
					if ( (data[d]['Province/State']) !== '') {
						countries[data[d]['Country/Region']]['States'][data[d]['Province/State']]['deaths'][countries[data[d]['Country/Region']]['States'][data[d]['Province/State']]['deaths'].length] = data[d];
					}
				}
			}
			progress.value += 1;
			console.log("[OK] JHU DEATHS_GLOBAL")
			
			njobs--;
			if (njobs == 0)
				prepare_data();
		}, function() {
			console.log("[!] JHU DEATHS_GLOBAL")
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
				if (typeof (data[d]['Country/Region']) !== 'undefined') {
					// is it the first time we see this country? if so, initialize the array
					if (typeof (countries[data[d]['Country/Region']]) === 'undefined') {
						countries[data[d]['Country/Region']] = [];
						countries[data[d]['Country/Region']]['States'] = [];
					}
					
					// country-wide data
					if (typeof(countries[data[d]['Country/Region']]['recovered']) === 'undefined'){
						countries[data[d]['Country/Region']]["recovered"] = [];
					}
					if (data[d]['Province/State'] !== ''){
						if ( (countries[data[d]['Country/Region']]['States'][data[d]['Province/State']] === undefined)) {
							countries[data[d]['Country/Region']]['States'][data[d]['Province/State']] = [];
						}
						if ((countries[data[d]['Country/Region']]['States'][data[d]['Province/State']]['recovered'] === undefined)) {
							countries[data[d]['Country/Region']]['States'][data[d]['Province/State']]['recovered'] = [];
						}
					}

					countries[data[d]['Country/Region']]['recovered'][countries[data[d]['Country/Region']]["recovered"].length] = data[d];
					
					if ( (data[d]['Province/State']) !== '') {
						countries[data[d]['Country/Region']]['States'][data[d]['Province/State']]['recovered'][countries[data[d]['Country/Region']]['States'][data[d]['Province/State']]['recovered'].length] = data[d];
					}
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


	///// ||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||| \\\\\\
	///// **********************  US data fetching starts here *********************************  \\\\\\\
	///// ||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||| \\\\\\\\

	var settings = {
		"crossDomain": true,
		"url": "https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_time_series/time_series_covid19_confirmed_US.csv",
		"method": "GET",
		"dataType" : "text"
	}
	$.ajax(settings).then(
		function (res) {
			var data = d3.csvParse(res);
			// console.log(data)
			for (d = 0; d < data.length; d++) {
				if (typeof(data[d]['Country_Region']) !== 'undefined') {
					if (typeof (countries[data[d]['Country_Region']]) === 'undefined') {
						countries[data[d]['Country_Region']] = [];
						countries[data[d]['Country_Region']]['States'] = [];
						countries[data[d]['Country_Region']]['States']['Counties'] = [];
					}

					if (typeof (countries[data[d]['Country_Region']]['States'][data[d]['Province_State']]) === 'undefined') {
						countries[data[d]['Country_Region']]['States'][data[d]['Province_State']] = [];
						countries[data[d]['Country_Region']]['States'][data[d]['Province_State']]['confirmed'] = [];
						if (countries[data[d]['Country_Region']]['States'][data[d]['Province_State']]['Counties'] == undefined) {
							countries[data[d]['Country_Region']]['States'][data[d]['Province_State']]['Counties'] = [];
						}
					}
					let county = data[d]['Admin2'];
					if (county.substring(0, 6).localeCompare('Out of')!=0 && county.localeCompare('Unassigned') != 0 &&  county.localeCompare('') != 0) {
						if (countries[data[d]['Country_Region']]['States'][data[d]['Province_State']]['Counties'][data[d]['Admin2']] == undefined) {
							countries[data[d]['Country_Region']]['States'][data[d]['Province_State']]['Counties'][data[d]['Admin2']] = [];
						}
						countries[data[d]['Country_Region']]['States'][data[d]['Province_State']]['Counties'][data[d]['Admin2']]['confirmed'] = data[d];
					}
					else if (county.localeCompare('') == 0) {
						countries[data[d]['Country_Region']]['States'][data[d]['Province_State']]['confirmed'] = data[d];
					}
				}
			}
			progress.value += 1;
			console.log("[OK] JHU CONFIRMED_US")
			
			njobs--;
			if (njobs == 0)
				prepare_data();
		}, function() {
			console.log("[!] JHU CONFIRMED_US")
	});

	var settings = {
		"crossDomain": true,
		"url": "https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_time_series/time_series_covid19_deaths_US.csv",
		"method": "GET",
		"dataType" : "text"
	}
	$.ajax(settings).then(
		function (res) {
			var data = d3.csvParse(res);
			console.log(data)
			for (d = 0; d < data.length; d++) {
				if (typeof(data[d]['Country_Region']) !== 'undefined') {
					if (typeof (countries[data[d]['Country_Region']]) === 'undefined') {
						countries[data[d]['Country_Region']] = [];
						countries[data[d]['Country_Region']]['deaths'] = [];
						countries[data[d]['Country_Region']]['States'] = [];
						countries[data[d]['Country_Region']]['States']['Counties'] = [];
					}

					if ((countries[data[d]['Country_Region']]['States'][data[d]['Province_State']]) == undefined)
						countries[data[d]['Country_Region']]['States'][data[d]['Province_State']] = [];
					if (countries[data[d]['Country_Region']]['States'][data[d]['Province_State']]['deaths'] == undefined)
						countries[data[d]['Country_Region']]['States'][data[d]['Province_State']]['deaths'] = [];
				
					if (countries[data[d]['Country_Region']]['States'][data[d]['Province_State']]['Counties'] == undefined)
							countries[data[d]['Country_Region']]['States'][data[d]['Province_State']]['Counties'] = [];
				

					let county = data[d]['Admin2'];
					// console.log('Data: ' + county)
					if (county.substring(0, 6).localeCompare('Out of')!=0 && county.localeCompare('Unassigned') != 0 &&  county.localeCompare('') != 0) {
						// console.log('Insert county ' + county)
						if (countries[data[d]['Country_Region']]['States'][data[d]['Province_State']]['Counties'][data[d]['Admin2']] == undefined) {
							countries[data[d]['Country_Region']]['States'][data[d]['Province_State']]['Counties'][data[d]['Admin2']] = [];
						}
						countries[data[d]['Country_Region']]['States'][data[d]['Province_State']]['Counties'][data[d]['Admin2']]['deaths'] = data[d];
					}
					else if (county.localeCompare('') == 0) {
						countries[data[d]['Country_Region']]['States'][data[d]['Province_State']]['deaths'] = data[d];
					}
				}
			}
			progress.value += 1;
			console.log("[OK] JHU DEATHS_US")
			
			njobs--;
			if (njobs == 0)
				prepare_data();
		}, function() {
			console.log("[!] JHU DEATHS_US")
	});
}