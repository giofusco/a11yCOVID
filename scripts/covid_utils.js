//
//
// Created by Giovanni Fusco - The Smith-Kettlewell Eye Research Institute, Copyright 2020
//
// If you are reading this, I'm sorry for you. It's messy and it needs refactoring desperately.
// Can you help? Contact me! info-covid@ski.org
//
//

// this global variable is used to collect all the asynch reponses
var njobs = 8;

var countries = [];
var country_name2iso = [];
var country_iso2name = [];
var data_ready = false;
var daily_report_us_states = [];
var daily_report_regions = [];
// const daily_reports_base_URL = ['https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_daily_reports/', 'https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_daily_reports_us/'];
const daily_reports_base_url_local = "https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_daily_reports/";
const daily_reports_base_url_US_states = "https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_daily_reports_us/";

// how long to play a single data point (in secs)
let sample_length = 0.05;

function sonify(form_id, caller_id, data, f0, n_octaves) {
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
    var play_ref_tone = document.getElementById(form_id).querySelector("#play_reference_tone").checked;
    var stereo_pan = document.getElementById(form_id).querySelector("#stereo_panning").checked;
    var unison = document.getElementById(form_id).querySelector("#play_reference_tone_unison").checked;
    var play_tickmark = document.getElementById(form_id).querySelector("#play_tickmark").checked;

    var frequencies = [];
    for (v = 0; v < values.length; v++)
        frequencies[v] = (((data[v] - d_min) * (f_max - f0)) / (d_max - d_min)) + f0;
    play_pulse(frequencies, stereo_pan, play_ref_tone, unison, play_tickmark, f0);
}


/**/ //////////////////////////////////////////////////////////**/
/** ** BEN :: shortening and remodelling oscillation setup ** **/
/**/ //////////////////////////////////////////////////////////**/
const oscillator_call_feedback = (array) => { for (let item of array.values()) console.log(item); }; // BEN :: just prints the handled oscillators to console

const setupOscillator = (oscName, type) => { // later needs array property 'isPlaying' to make reclick stop osc first and then restart. weird stuff that is.
    i = 0;
    len = oscName.length - 1;
    while (i <= len) {
        oscName[i].type = type;
        oscName[i].frequency = 0;
        i++;
    };
    console.log(oscName.length + ' oscillators set up and [OK] :: ', oscillator_call_feedback(oscName));
};
/**/ //////////////////////////////////////////////////////////**/


function play_pulse(freqs, pan, play_ref_tone, unison, play_tickmark, f0) {
    // for cross browser compatibility
    let audioCtx = new(window.AudioContext || window.webkitAudioContext)();
    let gainNode = audioCtx.createGain() || audioCtx.createGainNode();
    var panNode;

    var is_safari = !!navigator.userAgent.match(/Version\/[\d\.]+.*Safari/);

    if (!is_safari) {
        panNode = audioCtx.createStereoPanner();
        panNode.pan.value = 0;
        var panStep = 2 / freqs.length;
        var freqLen = freqs.length;
        if (pan)
            panNode.pan.value = -1;
    }
    gainNode.gain.minValue = 0;
    gainNode.gain.maxValue = 1;
    gainNode.gain.value = 0.025;

    //base oscillators
    var oscillator = audioCtx.createOscillator();
    var oscillator2 = audioCtx.createOscillator();
    var oscillator3 = audioCtx.createOscillator();
    //ref tone oscillators
    var refToneOscillator = audioCtx.createOscillator();
    var refToneOscillator2 = audioCtx.createOscillator();
    var refToneOscillator3 = audioCtx.createOscillator();
    //weekly oscillators
    var weekOscillator = audioCtx.createOscillator();
    var weekOscillator2 = audioCtx.createOscillator();

    /**/ ////////////////////////////////////////////**/
    /** ** BEN :: shortening oscillation calling ** **/
    /**/ ////////////////////////////////////////////**/
    const oscArr = [oscillator, oscillator2, oscillator3];
    const refOscArr = [refToneOscillator, refToneOscillator2, refToneOscillator3];
    const weekOscArr = [weekOscillator, weekOscillator2];

    setupOscillator(oscArr, 'triangle');
    setupOscillator(refOscArr, 'sine');
    setupOscillator(weekOscArr, 'sawtooth');
    /**/ ////////////////////////////////////////////**/


    let t0 = audioCtx.currentTime;
    let tickFreq = 500;
    var cnt = 0;
    var sample_spacing = 1;
    if (play_ref_tone)
        sample_spacing = 2;

    if (play_tickmark) {
        for (i = 0; i < freqs.length; i++) {
            gainNode.gain.setValueAtTime(0.025, t0 + i * sample_length);
            if (cnt == 14) {
                weekOscillator.frequency.setValueAtTime(tickFreq, t0 + (sample_spacing * i) * sample_length);
                weekOscillator2.frequency.setValueAtTime(.33 * tickFreq, t0 + (sample_spacing * i) * sample_length);
                cnt++;
            } else if (cnt == 29) {
                weekOscillator.frequency.setValueAtTime(2 * tickFreq, t0 + (sample_spacing * i) * sample_length);
                weekOscillator2.frequency.setValueAtTime(.33 * tickFreq, t0 + (sample_spacing * i) * sample_length);
                cnt = 0;
            } else {
                cnt++;
                weekOscillator.frequency.setValueAtTime(0, t0 + (sample_spacing * i) * sample_length);
                weekOscillator2.frequency.setValueAtTime(0, t0 + (sample_spacing * i) * sample_length);
            }
        }
    }

    if (play_ref_tone || unison) {
        // var step = 3;
        // if (unison)
        //     step = 1;
        for (i = 0; i < freqs.length; i++) {
            gainNode.gain.setValueAtTime(0.025, t0 + sample_spacing * i * sample_length);
            oscillator.frequency.setValueAtTime(freqs[i], t0 + sample_spacing * i * sample_length);
            oscillator2.frequency.setValueAtTime(3 * freqs[i], t0 + sample_spacing * i * sample_length);
            oscillator3.frequency.setValueAtTime(2 * freqs[i], t0 + sample_spacing * i * sample_length);
            if (!unison) {
                oscillator.frequency.setValueAtTime(f0, t0 + (sample_spacing * i + 1) * sample_length);
                oscillator2.frequency.setValueAtTime(3 * f0, t0 + (sample_spacing * i + 1) * sample_length);
                oscillator3.frequency.setValueAtTime(2 * f0, t0 + (sample_spacing * i + 1) * sample_length);
            } else {
                refToneOscillator.frequency.setValueAtTime(f0, t0 + sample_spacing * i * sample_length);
                refToneOscillator2.frequency.setValueAtTime(3 * f0, t0 + sample_spacing * i * sample_length);
                refToneOscillator3.frequency.setValueAtTime(2 * f0, t0 + sample_spacing * i * sample_length);
            }
            if (pan && !is_safari)
                panNode.pan.setValueAtTime(panNode.pan.value + i * panStep, t0 + sample_spacing * i * sample_length);
        }

        gainNode.gain.exponentialRampToValueAtTime(
            0.00001, t0 + (sample_spacing * freqLen + 1) * sample_length
        )

        refToneOscillator.connect(gainNode).connect(audioCtx.destination);
        refToneOscillator2.connect(gainNode).connect(audioCtx.destination);
        refToneOscillator3.connect(gainNode).connect(audioCtx.destination);

        if (!is_safari) {
            oscillator.connect(gainNode).connect(panNode).connect(audioCtx.destination);
            oscillator2.connect(gainNode).connect(panNode).connect(audioCtx.destination);
            oscillator3.connect(gainNode).connect(panNode).connect(audioCtx.destination);

        } else {
            oscillator.connect(gainNode).connect(panNode).connect(audioCtx.destination);
            oscillator2.connect(gainNode).connect(panNode).connect(audioCtx.destination);
            oscillator3.connect(gainNode).connect(panNode).connect(audioCtx.destination);
        }

        oscillator.start();
        oscillator2.start();
        oscillator3.start();
        if (unison) {
            refToneOscillator.start();
            refToneOscillator2.start();
            refToneOscillator3.start();
        }
        // oscillator.stop(t0 + freqs.length * 3 * sample_length);
        // refToneOscillator.stop(t0 + freqs.length * 3 * sample_length);
        if (play_tickmark) {
            weekOscillator.connect(gainNode).connect(audioCtx.destination);
            weekOscillator2.connect(gainNode).connect(audioCtx.destination);
            weekOscillator.start();
            weekOscillator2.start();
        }
        // weekOscillator.stop(t0 + freqs.length * 3 * sample_length);
    } else {
        for (i = 0; i < freqs.length; i++) {
            oscillator.frequency.setValueAtTime(freqs[i], t0 + i * sample_length);
            oscillator2.frequency.setValueAtTime(3 * freqs[i], t0 + i * sample_length);
            oscillator3.frequency.setValueAtTime(0.33 * freqs[i], t0 + i * sample_length);
            gainNode.gain.setValueAtTime(0.025, t0 + i * sample_length);
            if (pan && !is_safari)
                panNode.pan.setValueAtTime(panNode.pan.value + i * panStep, t0 + i * sample_length);
        }
        gainNode.gain.exponentialRampToValueAtTime(
            0.00001, t0 + freqs.length * sample_length
        )
        if (!is_safari) {
            oscillator.connect(gainNode).connect(panNode).connect(audioCtx.destination);
            oscillator2.connect(gainNode).connect(panNode).connect(audioCtx.destination);
            oscillator3.connect(gainNode).connect(panNode).connect(audioCtx.destination);
        } else {
            oscillator.connect(gainNode).connect(audioCtx.destination);
            oscillator2.connect(gainNode).connect(audioCtx.destination);
            oscillator3.connect(gainNode).connect(audioCtx.destination);
        }

        oscillator.start();
        oscillator2.start();
        oscillator3.start();
        // oscillator.stop(t0 + freqLen * sample_length);
        if (play_tickmark) {
            weekOscillator.connect(gainNode).connect(audioCtx.destination);
            weekOscillator2.connect(gainNode).connect(audioCtx.destination);
            weekOscillator.start();
            weekOscillator2.start();
        }
        // weekOscillator.stop(t0 + freqLen * sample_length);
    }
}

// this function handles the event triggered after getting the data
$(document).bind('dataReadyEvent', function(e) {
    console.log('GENERATING CONTENT...');
    document.getElementById('fetching_progress_section').remove(); // remove progress bar because we are done loading
    create_article('World', '', '', 'main_article');
    setup_country_selection_dom('country_select');
    console.log('GENERATING CONTENT... OK!');
});

function create_about_page(container_id) {
    var container = document.getElementById(container_id);
    var section = document.createElement('section');
    var row1 = document.createElement('div');
    row1.className = 'row';
    var content_cell = document.createElement('div');
    var padding_cell = document.createElement('div');
    content_cell.innerHTML = `<hr>
        <h3>About the Project</h3>
        <p>So much of the conversation around this pandemic has been about trends: curves and how to flatten them, models, exponential growth, etc. That's usually conveyed visually, 
        which means people who can't see graphs are excluded from the information driving our discourse,
        even if the raw data are screen-readable.
        Access to this data is unavailable to the roughly 39 million people around the globe who are blind. 
        This project makes the data sourced by Johns Hopkins University accessible to people with visual impairments. 
        The plots are automatically described to screen readers and sonified on demand.</p>
        <h3> The Author </h3>
        I'm Giovanni Fusco, a researcher at the Rehabilitation Engineering Research Center at the Smith-Kettlewell Eye Research Institute.
        My research focuses on developing tools to reduce accessibility barriers in the STEM field.
        <br>
        More info available at the <a href="https://www.ski.org" target="_blank">Smith-Kettlewell Research Institute website</a>
        <br><br>
    
        <h3> Funding </h3>
        <p>This project was supported by NIDILRR grant number 90RE5024-01-00 from the U.S. Administration for Community Living, Department of Health and Human Services, Washington, D.C. 20201.  </p>
        <br><br><small> Disclaimer: Grantees undertaking projects with government sponsorship are encouraged to express freely 
        their findings and conclusions. Points of view or opinions do not, therefore, necessarily represent official ACL policy. </small></p>
    `;

    row1.appendChild(content_cell);
    row1.appendChild(padding_cell);
    section.appendChild(row1);
    container.appendChild(section);
}


function create_feedback_page(container_id) {
    var container = document.getElementById(container_id);
    var section = document.createElement('section');
    var row1 = document.createElement('div');
    row1.className = 'row';
    var content_cell = document.createElement('div');
    // content_cell.className = 'col'
    var padding_cell = document.createElement('div');
    // padding_cell.className = 'col'
    content_cell.innerHTML = `<hr>
        <h2>Let me know!</h2>
        <p>To report bugs, ask for help, request features or for general feedback,  
        email support at <a href="mailto:info-covid@ski.org">info-covid@ski.org</a> <br>
        or leave a feedback using the form below.</p><br>
        <iframe src="https://docs.google.com/forms/d/e/1FAIpQLSdbAGLbN2nays3Txrb9Re4VizraACZAhrcMeSMwRGwLjGZIqw/viewform?embedded=true" width="640" height="900" frameborder="0" marginheight="0" marginwidth="0" style="margin: auto auto">Loading…</iframe>`
    section.appendChild(content_cell);
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
    row.className = 'row';

    var link_to_main = document.createElement('a');
    link_to_main.href = '#';
    link_to_main.addEventListener("click", function() {
        handle_selection('World', '', '');
    });
    link_to_main.innerText = 'Back to World page';


    var country_table_cell = document.createElement('div');
    country_table_cell.id = 'countries_table';
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
            country_row.innerHTML = `<th scope='row'><a href="#" onClick="handle_selection('${country_name2iso[sorted_countries[s]]}', '', '')" title="jump to">${sorted_countries[s]}</a></th>
                                                        <td>${countries[sorted_countries[s]].confirmed_timeline.slice(-1)[0].toLocaleString()}</td>
                                                        <td>${countries[sorted_countries[s]].confirmed_daily.slice(-1)[0].toLocaleString()}</td>
                                                        <td>${countries[sorted_countries[s]].deaths_timeline.slice(-1)[0].toLocaleString()}</td>
                                                        <td>${countries[sorted_countries[s]].deaths_daily.slice(-1)[0].toLocaleString()}</td>`;
            country_table.appendChild(country_row);
        }
    }
    country_table_cell.appendChild(country_table);
    var padding_cell = document.createElement('div');
    padding_cell.className = 'col-2 text-center';
    row.appendChild(padding_cell);
    row.appendChild(country_table_cell);
    section.appendChild(row);
    container.appendChild(section);
}

function numberWithCommas(x) {
    var parts = x.toString().split(".");
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return parts.join(".");
}

function create_summary_cell(country_code, country_name, country_name_label, state_name, county_name) {
    let curr_stats = get_latest_stats(state_name, country_code, county_name);
    var summary_cell = document.createElement('div');
    summary_cell.className = 'col'

    var summary_paragraph = document.createElement('div');
    summary_paragraph.className = "card";
    summary_paragraph.innerHTML +=
        `<div class="card-header"> <h2> ${country_name_label} </h2></div>
            <div class="card-body">
              <h3>Brief</h3><small class="text-muted"> updated daily at 23:59 (UTC).</small>`;

    // var summary_paragraph = document.createElement('p'); 

    if (is_empty(state_name)) {
        summary_paragraph.innerHTML += `<ul class="list-group list-group-flush">`;
        if (curr_stats.active_number != 1)
            summary_paragraph.innerHTML += `<li class="list-group-item"><b>Active</b> Cases: ${curr_stats.active_number.toLocaleString()}`;
        else
            summary_paragraph.innerHTML += `<li class="list-group-item"><b>Active</b> Cases: 1`;

        summary_paragraph.innerHTML += `</li>
                                <li class="list-group-item">Total <b>Infections</b>: ${curr_stats.total_confirmed.toLocaleString()}</li>
                                <li class="list-group-item">Total <b>Recoveries</b>: ${curr_stats.total_recovered.toLocaleString()}</li>
                                <li class="list-group-item">Total <b>Deaths</b>: ${curr_stats.total_deaths.toLocaleString()}</li></ul>`;
        if (('US' == country_code) || ('CN' == country_code))
            summary_paragraph.innerHTML += ` </div><p align='center'><a href="#states_table">Jump to States list</a></p>`
    } else if (is_empty(county_name) && ('US' == country_code)) { //state
        summary_paragraph.innerHTML += `<ul class="list-group list-group-flush">`;

        if (typeof daily_report_us_states[state_name] !== "undefined")
            summary_paragraph.innerHTML += `<li class="list-group-item"><b>Active</b> cases: ${parseInt(daily_report_us_states[state_name].active).toLocaleString()}`;

        summary_paragraph.innerHTML += `
                                <li class="list-group-item">Total <b>Infections</b>: ${curr_stats.total_confirmed.toLocaleString()}</li>
                                <li class="list-group-item">Total <b>Deaths</b>: ${curr_stats.total_deaths.toLocaleString()}</li>`

        if (typeof(daily_report_us_states[state_name].test_rate) === "undefined")
            summary_paragraph.innerHTML += `<li class="list-group-item">Tests x 100,000 People: N/A</li>`;
        else
            summary_paragraph.innerHTML += `<li class="list-group-item">Tests x 100,000 People: ${parseFloat(daily_report_us_states[state_name].test_rate).toFixed(2).toLocaleString()} </li>`;
        summary_paragraph.innerHTML += `<li class="list-group-item">Cases x 100,000 People: ${parseFloat(daily_report_us_states[state_name].incidence_rate).toLocaleString()} </li>`;
        summary_paragraph.innerHTML += `<li class="list-group-item">Mortality Rate: ${parseFloat(daily_report_us_states[state_name].mortality_rate).toFixed(2).toLocaleString()} %</li>`;
        if (typeof(daily_report_us_states[state_name].hospitalization_rate) === "undefined" || is_empty(daily_report_us_states[state_name].hospitalization_rate))
            summary_paragraph.innerHTML += `<li class="list-group-item">Hospitalization Rate: N/A</li></ul>`;
        else
            summary_paragraph.innerHTML += `<li class="list-group-item">Hospitalization Rate: ${parseFloat(daily_report_us_states[state_name].hospitalization_rate).toFixed(2).toLocaleString()} %</li></ul>`;
        summary_paragraph.innerHTML += `</div><ul class="list-group list-group-flush"><li class="list-group-item"><p align='center'><a href="#counties_table">Jump to Counties list</a></p></li></ul>`;
    } else if (is_empty(county_name) && ('CN' == country_code)) { //state of china
        summary_paragraph.innerHTML += `<ul class="list-group list-group-flush">`;

        if (typeof daily_report_regions[country_name].Province_State[state_name] !== "undefined")
            summary_paragraph.innerHTML += `<li class="list-group-item"><b>Active</b> cases: ${parseInt(daily_report_regions[country_name].Province_State[state_name].active).toLocaleString()}`;

        summary_paragraph.innerHTML += `
                                <li class="list-group-item">Total <b>Infections</b>: ${curr_stats.total_confirmed.toLocaleString()}</li>
                                <li class="list-group-item">Total <b>Deaths</b>: ${curr_stats.total_deaths.toLocaleString()}</li>`

        if (typeof(daily_report_regions[country_name].Province_State[state_name].test_rate) === "undefined")
            summary_paragraph.innerHTML += `<li class="list-group-item">Cases x 100,000 People: ${parseFloat(daily_report_regions[country_name].Province_State[state_name].incidence_rate).toFixed(2).toLocaleString()} </li>`;
        summary_paragraph.innerHTML += `<li class="list-group-item">Mortality Rate: ${parseFloat(daily_report_regions[country_name].Province_State[state_name].case_fatality_ratio).toFixed(2).toLocaleString()} %</li>`;

        summary_paragraph.innerHTML += `</div>`;
        summary_paragraph.innerHTML += `</div>`;

    } else { // US county summary
        summary_paragraph.innerHTML += `<ul class="list-group list-group-flush">`;
        summary_paragraph.innerHTML += `<li class="list-group-item"><b>Active</b> Cases: ${parseInt(daily_report_regions[country_code].Province_State[state_name].County[county_name].active).toLocaleString()}`;
        summary_paragraph.innerHTML += `
                                <li class="list-group-item">Total <strong>Infections</strong>: ${curr_stats.total_confirmed.toLocaleString()}</li>
                                <li class="list-group-item">Total <strong>Deaths</strong>: ${curr_stats.total_deaths.toLocaleString()}</li>`;
        // if ('US' == country_code) {
        summary_paragraph.innerHTML += `<li class="list-group-item">Incidence Rate: 
            ${parseFloat(daily_report_regions[country_code].Province_State[state_name].County[county_name]['incidence_rate']).toFixed(2).toLocaleString()} x 100,000 people</li>`;

        if (typeof(daily_report_regions[country_code].Province_State[state_name].case_fatality_ratio) === "undefined" || is_empty(daily_report_regions[country_code].Province_State[state_name].case_fatality_ratio))
            summary_paragraph.innerHTML += `<li class="list-group-item">Mortality Rate: N/A</li></ul>`;
        else
            summary_paragraph.innerHTML += `<li class="list-group-item">Mortality Rate: ${parseFloat(daily_report_regions[country_code].Province_State[state_name].case_fatality_ratio).toFixed(2).toLocaleString()} %</li></ul>`;

        summary_paragraph.innerHTML += `</div><ul class="list-group list-group-flush"><li class="list-group-item"><p align='center'><a href="#counties_table">Jump to Counties list</a></p></li></ul>`;
        summary_paragraph.innerHTML += `</div>`;

        // // }
        // summary_paragraph.innerHTML += `</ul>`;
        // if ('US' == country_code)
        //     summary_paragraph.innerHTML += `<br><br><p align='left'><a href="#counties_table">Jump to Counties list</a></p>`
    }

    summary_cell.appendChild(summary_paragraph);
    return summary_cell;
}

function get_latest_stats(state_name, country_code, county_name) {
    var active_number = undefined;
    var total_confirmed = undefined;
    var total_recovered = undefined;
    var total_deaths = undefined;

    if (is_empty(state_name)) {
        active_number = countries[country_iso2name[country_code]].active_timeline[countries[country_iso2name[country_code]].active_timeline.length - 1]
        total_confirmed = countries[country_iso2name[country_code]].confirmed_timeline[countries[country_iso2name[country_code]].confirmed_timeline.length - 1]
        total_recovered = countries[country_iso2name[country_code]].recovered_timeline[countries[country_iso2name[country_code]].recovered_timeline.length - 1]
        total_deaths = countries[country_iso2name[country_code]].deaths_timeline[countries[country_iso2name[country_code]].deaths_timeline.length - 1]
    } else if (is_empty(county_name)) {
        total_confirmed = countries[country_iso2name[country_code]].States[state_name].confirmed_timeline[countries[country_iso2name[country_code]].confirmed_timeline.length - 1]
        total_deaths = countries[country_iso2name[country_code]].States[state_name].deaths_timeline[countries[country_iso2name[country_code]].deaths_timeline.length - 1]
    } else {
        total_confirmed = countries[country_iso2name[country_code]].States[state_name].Counties[county_name].confirmed_timeline[countries[country_iso2name[country_code]].confirmed_timeline.length - 1]
        total_deaths = countries[country_iso2name[country_code]].States[state_name].Counties[county_name].deaths_timeline[countries[country_iso2name[country_code]].deaths_timeline.length - 1]
    }
    return { active_number, total_confirmed, total_recovered, total_deaths };
}

function create_country_name_label(country_name, state_name, country_code, county_name) {
    var country_name_label = country_name;
    if ((country_code == 'World' || country_code === 'US' || country_code === 'BS') && (state_name.localeCompare('') == 0))
        country_name_label = 'The ' + country_name_label;
    if (county_name.localeCompare('') != 0)
        country_name_label = county_name + ', ' + state_name + ', ' + country_name2iso[country_name_label];
    else if (state_name.localeCompare('') != 0)
        country_name_label = state_name + ', ' + country_name;

    return country_name_label;
}

function create_active_plot_cell(country_code, country_name, country_name_label) {
    var canvas_active = document.createElement('canvas');
    canvas_active.width = window.innerWidth;
    canvas_active.height = window.innerHeight;
    canvas_active.id = `canvas_active_${country_code}`
    var active_tml_stats = get_data_stats(countries[country_name]['active_timeline'], country_name);
    var active_tml_caption = `The values range from ${active_tml_stats.min_val.toLocaleString()} on 
        ${active_tml_stats.min_key.toLocaleString()} to ${active_tml_stats.max_val.toLocaleString()} on ${active_tml_stats.max_key.toLocaleString()}.`;

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

    generate_plot(canvas_active, ``, 1, 'black', 'salmon', false, countries[country_name]['active_timeline']);
    active_plot_cell.appendChild(document.createElement('br'));
    active_plot_cell.appendChild(canvas_active);
    active_plot_cell.appendChild(document.createElement('br'));
    add_button(`Sonify ${country_name_label} Active Cases Plot`, 'active_plot_controls', active_plot_cell, `sonify_active_${country_name}_button_id`,
        `sonify('active_plot_controls', 'stereo_panning_sonify_active_${country_name}_button_id', countries['${country_name}']['active_timeline'], 220, 2);`);
    active_plot_cell.appendChild(document.createElement('br'));
    active_plot_cell.appendChild(document.createElement('br'));

    return active_plot_cell;
}

function create_confirmed_plot_cell(country_code, country_name, country_name_label) {
    var canvas_confirmed = document.createElement('canvas');
    canvas_confirmed.width = window.innerWidth;
    canvas_confirmed.height = window.innerHeight;
    canvas_confirmed.id = `canvas_new_confirmed_${country_code}`
    confirmed_stats = get_data_stats(countries[country_name]['confirmed_daily'], country_name);
    var confirmed_caption = `The values range from ${confirmed_stats.min_val.toLocaleString()} on ${confirmed_stats.min_key.toLocaleString()} 
            to ${confirmed_stats.max_val.toLocaleString()} on ${confirmed_stats.max_key.toLocaleString()}.`;
    if (confirmed_stats.min_val != confirmed_stats.first_val)
        confirmed_caption += `The first ${confirmed_stats.first_val.toLocaleString()} infections were recorded on ${confirmed_stats.first_key.toLocaleString()}`;
    var confirmed_plot_cell = document.createElement('div');
    confirmed_plot_cell.className = 'col-sm text-center';

    canvas_confirmed.setAttribute('aria-label', `This plot shows the total number of new COVID-19 infections
        from the beginning of the pandemic on ${countries[country_name].dates[0].toLocaleString()} to the latest update.`);

    canvas_confirmed.innerHTML = `<p role="region" aria-live="polite"
        id="confirmed_cases_chart_fallback"> ${confirmed_caption} </p>`;

    generate_plot(canvas_confirmed, ``, 1, 'black', 'teal', false,
        countries[`${country_name}`]['confirmed_timeline']);

    var plot_header_confirmed = document.createElement('h3');
    plot_header_confirmed.innerText = 'Plot - Total Confirmed Cases of COVID-19 in ' + country_name_label;
    confirmed_plot_cell.append(plot_header_confirmed);

    confirmed_plot_cell.appendChild(canvas_confirmed);
    confirmed_plot_cell.appendChild(document.createElement('br'));
    add_button(`Sonify ${country_name_label} Total Confirmed Cases Plot`, 'confimed_plot_controls', confirmed_plot_cell, `sonify_confirmed_${country_name}_button_id`,
        `sonify('confimed_plot_controls', 'stereo_panning_sonify_confirmed_${country_name}_button_id', countries['${country_name}']['confirmed_timeline'],220, 2);`);
    confirmed_plot_cell.appendChild(document.createElement('br'));
    confirmed_plot_cell.appendChild(document.createElement('br'));

    return confirmed_plot_cell;
}

function create_deaths_plot_cell(country_code, country_name, country_name_label) {
    var canvas_deaths = document.createElement('canvas');
    canvas_deaths.width = window.innerWidth;
    canvas_deaths.height = window.innerHeight;

    canvas_deaths.id = `canvas_deaths_confirmed_${country_code}`
    deaths_stats = get_data_stats(countries[country_name]['deaths_daily'], country_name);
    var deaths_caption = `The values range from ${deaths_stats.min_val.toLocaleString()} on ${deaths_stats.min_key.toLocaleString()} 
    to ${deaths_stats.max_val.toLocaleString()} on ${deaths_stats.max_key.toLocaleString()}.`;
    if (deaths_stats.min_val != deaths_stats.first_val)
        deaths_caption += `The first ${deaths_stats.first_val.toLocaleString()} deaths were recorded on ${deaths_stats.first_key.toLocaleString()}`;

    var deaths_caption = `The values range from ${deaths_stats.min_val.toLocaleString()} on ${deaths_stats.min_key.toLocaleString()} 
    to ${deaths_stats.max_val.toLocaleString()} on ${deaths_stats.max_key.toLocaleString()}.`;
    if (deaths_stats.min_val != deaths_stats.first_val)
        deaths_caption += `The first ${deaths_stats.first_val.toLocaleString()} deaths were recorded on ${deaths_stats.first_key.toLocaleString()}`;

    var deaths_plot_cell = document.createElement('div');
    deaths_plot_cell.className = 'col-sm text-center';

    canvas_deaths.setAttribute('aria-label', `This plot shows the total number of COVID-19 
    deaths from the beginning of the pandemic on ${countries[country_name].dates[0].toLocaleString()} to the latest update.`);
    canvas_deaths.innerHTML = `<p role="region" aria-live="polite"
        id="confirmed_cases_chart_fallback">${deaths_caption}</p>`;

    generate_plot(canvas_deaths, ``, 1, 'black', 'gray', false, countries[country_name]['deaths_timeline']);

    var plot_header_deaths = document.createElement('h3');
    plot_header_deaths.innerText = 'Plot - Total COVID-19 Deaths in ' + country_name_label;
    deaths_plot_cell.append(plot_header_deaths);

    deaths_plot_cell.appendChild(canvas_deaths);
    deaths_plot_cell.appendChild(document.createElement('br'));
    add_button(`Sonify ${country_name} Total Deaths Plot`, 'deaths_plot_controls', deaths_plot_cell, `sonify_deaths_${country_name}_button_id`,
        `sonify('deaths_plot_controls', 'stereo_panning_sonify_deaths_${country_name}_button_id', countries['${country_name}']['deaths_timeline'],220, 2);`);

    return deaths_plot_cell;
}


function display_country_content(country_code, country_name, country_name_label, section) {
    var row1 = document.createElement('div');
    row1.className = 'row';
    var row2 = document.createElement('div');
    row2.className = 'row';
    var row3 = document.createElement('div');
    row3.className = 'row';

    var active_plot_cell = create_active_plot_cell(country_code, country_name, country_name_label);
    row1.appendChild(active_plot_cell);
    section.appendChild(row1);

    if (country_name !== 'World') {
        var confirmed_plot_cell = create_confirmed_plot_cell(country_code, country_name, country_name_label);
        var deaths_plot_cell = create_deaths_plot_cell(country_code, country_name, country_name_label);
        row2.appendChild(confirmed_plot_cell);
        row3.appendChild(deaths_plot_cell);
        section.appendChild(row2);
        section.appendChild(row3);

        var padding_cell = document.createElement('div');
        padding_cell.className = 'col-4 text-center';
        section.appendChild(padding_cell);
        var link_cell = document.createElement('div');
        link_cell.innerHTML = `<p align='center'><a href="#" onClick="handle_selection('World', '', '')" title="jump to">Table of Countries</a></p>`;
        if (country_code.localeCompare('US') != 0)
            section.appendChild(link_cell);

        if ('US' == country_code || 'CN' == country_code) {
            var padding_cell = document.createElement('div');
            padding_cell.className = 'col-2 text-center';
            section.appendChild(padding_cell);
            var states_cell = document.createElement('div');
            states_cell.className = 'col-sm text-center';
            states_cell.id = 'table_container';
            create_states_table(country_name, states_cell);
            section.appendChild(states_cell);
        }
    } else {
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

function create_state_confirmed_cumulative_plot_cell(state_name, country_name, country_name_label) {
    var canvas_daily_new = document.createElement('canvas');
    canvas_daily_new.width = window.innerWidth;
    canvas_daily_new.height = window.innerHeight;

    var daily_new_tml_stats = get_data_stats(countries[country_name].States[state_name]['confirmed_timeline'], country_name);
    var daily_new_tml_caption = `The values on tha vertical axis range from ${daily_new_tml_stats.min_val.toLocaleString()} recorded on 
                                    ${daily_new_tml_stats.min_key.toLocaleString()} 
        to ${daily_new_tml_stats.max_val.toLocaleString()} on ${daily_new_tml_stats.max_key.toLocaleString()}.`;

    var daily_new_plot_cell = document.createElement('div');
    daily_new_plot_cell.className = 'col-lg text-center';
    var plot_header = document.createElement('h3');
    plot_header.innerText = 'Plot - Total COVID-19 Infections Over Time in ' + country_name_label;
    daily_new_plot_cell.append(plot_header);

    canvas_daily_new.setAttribute('aria-label', `This plot shows the evolution of the total number of COVID-19 cases 
                                from the beginning of the pandemic on ${countries[country_name].dates[0].toLocaleString()} to the latest update.`);
    canvas_daily_new.innerHTML = `<p role="region" aria-live="polite"
                                id="daily_new_cases_chart_fallback">${daily_new_tml_caption}}</p>`;

    generate_plot(canvas_daily_new, ``, 1, 'black', 'rgba(125, 100, 45, 0.9)', false, countries[country_name].States[state_name]['confirmed_timeline']);
    daily_new_plot_cell.appendChild(document.createElement('br'));
    daily_new_plot_cell.appendChild(canvas_daily_new);
    daily_new_plot_cell.appendChild(document.createElement('br'));
    add_button(`Sonify Total Cases Plot`, 'daily_new_plot_controls', daily_new_plot_cell, `sonify_daily_new_${country_name}_button_id`,
        `sonify('daily_new_plot_controls', 'stereo_panning_sonify_daily_new_${country_name}_button_id', countries['${country_name}'].States['${state_name}']['confirmed_timeline'],220, 2);`);
    daily_new_plot_cell.appendChild(document.createElement('br'));
    daily_new_plot_cell.appendChild(document.createElement('br'));

    return daily_new_plot_cell;
}

function create_state_confirmed_daily_plot_cell(state_name, country_name, country_name_label) {
    var canvas_confirmed = document.createElement('canvas');
    canvas_confirmed.width = window.innerWidth;
    var confirmed_stats = get_data_stats(countries[country_name].States[state_name]['confirmed_daily'], country_name);
    var confirmed_caption = `The values range from ${confirmed_stats.min_val.toLocaleString()} on ${confirmed_stats.min_key.toLocaleString()} 
    to ${confirmed_stats.max_val.toLocaleString()} on ${confirmed_stats.max_key.toLocaleString()}.`;
    if (confirmed_stats.min_val != confirmed_stats.first_val)
        confirmed_caption += `The first ${confirmed_stats.first_val.toLocaleString()} infections were recorded on ${confirmed_stats.first_key.toLocaleString()}`;
    var confirmed_plot_cell = document.createElement('div');
    confirmed_plot_cell.className = 'col-sm text-center';

    canvas_confirmed.setAttribute('aria-label', `This plot shows the daily number of new COVID-19 infections
    from ${countries[country_name].dates[0].toLocaleString()} to the latest update.`);

    canvas_confirmed.innerHTML = `<p role="region" aria-live="polite"
        id="confirmed_cases_chart_fallback"> ${confirmed_caption} </p>`;
    generate_plot(canvas_confirmed, ``, 1, 'black', 'teal', false,
        countries[`${country_name}`].States[state_name]['confirmed_daily']);

    var plot_header_confirmed = document.createElement('h3');
    plot_header_confirmed.innerText = 'Plot - Daily New Cases of COVID-19 in ' + country_name_label;
    confirmed_plot_cell.append(plot_header_confirmed);

    confirmed_plot_cell.appendChild(canvas_confirmed);
    confirmed_plot_cell.appendChild(document.createElement('br'));
    add_button(`Sonify Daily New Cases Plot`, 'confirmed_plot_controls', confirmed_plot_cell, `sonify_confirmed_${country_name}_button_id`,
        `sonify('confirmed_plot_controls', 'stereo_panning_sonify_confirmed_${country_name}_button_id', moving_average(countries['${country_name}'].States['${state_name}']['confirmed_daily'], 14), 220, 1);`);
    confirmed_plot_cell.appendChild(document.createElement('br'));
    confirmed_plot_cell.appendChild(document.createElement('br'));
    return confirmed_plot_cell;
}

function create_state_deaths_plot_cell(state_name, country_name, country_name_label) {
    var canvas_deaths = document.createElement('canvas');
    canvas_deaths.width = window.innerWidth;
    canvas_deaths.height = window.innerHeight;

    var deaths_stats = get_data_stats(countries[country_name].States[state_name]['deaths_daily'], country_name);
    var deaths_caption = `The values range from ${deaths_stats.min_val.toLocaleString()} on ${deaths_stats.min_key.toLocaleString()} 
    to ${deaths_stats.max_val.toLocaleString()} on ${deaths_stats.max_key.toLocaleString()}.}`;

    if (deaths_stats.min_val != deaths_stats.first_val)
        deaths_caption += `The first ${deaths_stats.first_val.toLocaleString()} deaths were recorded on ${deaths_stats.first_key.toLocaleString()}`;

    var deaths_plot_cell = document.createElement('div');
    deaths_plot_cell.className = 'col-sm text-center';
    canvas_deaths.setAttribute('aria-label', `This plot shows the total number of COVID-19 
    deaths from ${countries[country_name].dates[0].toLocaleString()} to the latest update.`);
    canvas_deaths.innerHTML = `<p role="region" aria-live="polite"
        id="confirmed_cases_chart_fallback">${deaths_caption}</p>`;
    generate_plot(canvas_deaths, ``, 1, 'black', 'gray', false, countries[country_name].States[state_name]['deaths_timeline']);

    var plot_header_deaths = document.createElement('h3');
    plot_header_deaths.innerText = 'Plot - Total COVID-19 Deaths in ' + country_name_label;
    deaths_plot_cell.append(plot_header_deaths);
    deaths_plot_cell.appendChild(canvas_deaths);
    deaths_plot_cell.appendChild(document.createElement('br'));
    add_button(`Sonify Total Deaths Plot`, 'deaths_plot_controls', deaths_plot_cell, `sonify_deaths_${country_name}_button_id`,
        `sonify( 'deaths_plot_controls', 'stereo_panning_sonify_deaths_${country_name}_button_id', countries['${country_name}'].States['${state_name}']['deaths_timeline'],220, 2);`);
    return deaths_plot_cell;
}

function create_county_confirmed_cumulative_plot_cell(county_name, state_name, country_name, country_name_label) {
    var canvas_daily_new = document.createElement('canvas');
    canvas_daily_new.width = window.innerWidth;
    canvas_daily_new.height = window.innerHeight;

    var daily_new_tml_stats = get_data_stats(countries[country_name].States[state_name].Counties[county_name]['confirmed_timeline'], country_name);
    var daily_new_tml_caption = `The values on tha vertical axis range from ${daily_new_tml_stats.min_val.toLocaleString()} recorded on 
                                    ${daily_new_tml_stats.min_key.toLocaleString()} 
        to ${daily_new_tml_stats.max_val.toLocaleString()} on ${daily_new_tml_stats.max_key.toLocaleString()}.`;

    var daily_new_plot_cell = document.createElement('div');
    daily_new_plot_cell.className = 'col-lg text-center';
    var plot_header = document.createElement('h3');
    plot_header.innerText = 'Plot - Total COVID-19 Infections Over Time in ' + country_name_label;
    daily_new_plot_cell.append(plot_header);

    canvas_daily_new.setAttribute('aria-label', `This plot shows the evolution of the total number of COVID-19 cases 
                                from the beginning of the pandemic on ${countries[country_name].dates[0].toLocaleString()} to the latest update.`);
    canvas_daily_new.innerHTML = `<p role="region" aria-live="polite"
                                id="daily_new_cases_chart_fallback">${daily_new_tml_caption}}</p>`;

    generate_plot(canvas_daily_new, ``, 1, 'black', 'rgba(125, 100, 45, 0.9)', false, countries[country_name].States[state_name].Counties[county_name]['confirmed_timeline']);
    daily_new_plot_cell.appendChild(document.createElement('br'));
    daily_new_plot_cell.appendChild(canvas_daily_new);
    daily_new_plot_cell.appendChild(document.createElement('br'));
    add_button(`Sonify Total Cases Plot`, 'daily_new_plot_controls', daily_new_plot_cell, `sonify_daily_new_${country_name}_button_id`,
        `sonify('daily_new_plot_controls', 'stereo_panning_sonify_daily_new_${country_name}_button_id', countries['${country_name}'].States['${state_name}'].Counties['${county_name}']['confirmed_timeline'],220, 2);`);
    daily_new_plot_cell.appendChild(document.createElement('br'));
    daily_new_plot_cell.appendChild(document.createElement('br'));

    return daily_new_plot_cell;
}

function create_county_confirmed_daily_plot_cell(county_name, state_name, country_name, country_name_label) {
    var canvas_confirmed = document.createElement('canvas');
    canvas_confirmed.width = window.innerWidth;
    canvas_confirmed.height = window.innerHeight;
    var confirmed_stats = get_data_stats(countries[country_name].States[state_name].Counties[county_name]['confirmed_daily'], country_name);
    var confirmed_caption = `The values range from ${confirmed_stats.min_val.toLocaleString()} on ${confirmed_stats.min_key.toLocaleString()} 
    to ${confirmed_stats.max_val.toLocaleString()} on ${confirmed_stats.max_key.toLocaleString()}.`;
    if (confirmed_stats.min_val != confirmed_stats.first_val)
        confirmed_caption += `The first ${confirmed_stats.first_val.toLocaleString()} infections were recorded on ${confirmed_stats.first_key.toLocaleString()}`;
    var confirmed_plot_cell = document.createElement('div');
    confirmed_plot_cell.className = 'col-sm text-center';

    canvas_confirmed.setAttribute('aria-label', `This plot shows the daily number of new COVID-19 infections
    from ${countries[country_name].dates[0].toLocaleString()} to the latest update.`);

    canvas_confirmed.innerHTML = `<p role="region" aria-live="polite"
        id="confirmed_cases_chart_fallback"> ${confirmed_caption} </p>`;
    generate_plot(canvas_confirmed, ``, 1, 'black', 'teal', false,
        countries[`${country_name}`].States[state_name].Counties[county_name]['confirmed_daily']);

    var plot_header_confirmed = document.createElement('h3');
    plot_header_confirmed.innerText = 'Plot - Daily New Cases of COVID-19 in ' + country_name_label;
    confirmed_plot_cell.append(plot_header_confirmed);

    confirmed_plot_cell.appendChild(canvas_confirmed);
    confirmed_plot_cell.appendChild(document.createElement('br'));
    add_button(`Sonify Daily New Cases Plot`, 'confirmed_plot_controls', confirmed_plot_cell, `sonify_confirmed_${country_name}_button_id`,
        `sonify('confirmed_plot_controls', 'stereo_panning_sonify_confirmed_${country_name}_button_id', moving_average(countries['${country_name}'].States['${state_name}'].Counties['${county_name}']['confirmed_daily'], 14), 220, 1);`);
    confirmed_plot_cell.appendChild(document.createElement('br'));
    confirmed_plot_cell.appendChild(document.createElement('br'));
    return confirmed_plot_cell;
}

function create_county_deaths_plot_cell(county_name, state_name, country_name, country_name_label) {
    var canvas_deaths = document.createElement('canvas');
    canvas_deaths.width = window.innerWidth;
    canvas_deaths.height = window.innerHeight;

    var deaths_stats = get_data_stats(countries[country_name].States[state_name].Counties[county_name]['deaths_daily'], country_name);
    var deaths_caption = `The values range from ${deaths_stats.min_val.toLocaleString()} on ${deaths_stats.min_key.toLocaleString()} 
    to ${deaths_stats.max_val.toLocaleString()} on ${deaths_stats.max_key.toLocaleString()}.}`;

    if (deaths_stats.min_val != deaths_stats.first_val)
        deaths_caption += `The first ${deaths_stats.first_val.toLocaleString()} deaths were recorded on ${deaths_stats.first_key.toLocaleString()}`;

    var deaths_plot_cell = document.createElement('div');
    deaths_plot_cell.className = 'col-sm text-center';
    canvas_deaths.setAttribute('aria-label', `This plot shows the total number of COVID-19 
    deaths from ${countries[country_name].dates[0].toLocaleString()} to the latest update.`);
    canvas_deaths.innerHTML = `<p role="region" aria-live="polite"
        id="confirmed_cases_chart_fallback">${deaths_caption}</p>`;
    generate_plot(canvas_deaths, ``, 1, 'black', 'gray', false, countries[country_name].States[state_name].Counties[county_name]['deaths_timeline']);

    var plot_header_deaths = document.createElement('h3');
    plot_header_deaths.innerText = 'Plot - Total COVID-19 Deaths in ' + country_name_label;
    deaths_plot_cell.append(plot_header_deaths);
    deaths_plot_cell.appendChild(canvas_deaths);
    deaths_plot_cell.appendChild(document.createElement('br'));
    add_button(`Sonify Total Deaths Plot`, 'deaths_plot_controls', deaths_plot_cell, `sonify_deaths_${county_name}_button_id`,
        `sonify( 'deaths_plot_controls', 'stereo_panning_sonify_deaths_${county_name}_button_id', countries['${country_name}'].States['${state_name}'].Counties['${county_name}']['deaths_timeline'],220, 2);`);
    return deaths_plot_cell;
}

function display_state_content(state_name, country_code, country_name, country_name_label, section) {

    var row1 = document.createElement('div');
    row1.className = 'row';
    var row2 = document.createElement('div');
    row2.className = 'row';
    var row3 = document.createElement('div');
    row3.className = 'row';

    var daily_new_plot_cell = create_state_confirmed_cumulative_plot_cell(state_name, country_name, country_name_label);
    row1.appendChild(daily_new_plot_cell);
    section.appendChild(row1);

    var confirmed_plot_cell = create_state_confirmed_daily_plot_cell(state_name, country_name, country_name_label);
    var deaths_plot_cell = create_state_deaths_plot_cell(state_name, country_name, country_name_label);
    row2.appendChild(confirmed_plot_cell);
    row3.appendChild(deaths_plot_cell);
    section.appendChild(row2);
    section.appendChild(row3);

    if (typeof countries[country_name].States[s].Counties !== 'undefined') {
        // create table of counties
        var padding_cell = document.createElement('div');
        padding_cell.className = 'col-2 text-center';
        section.appendChild(padding_cell);
        var counties_cell = document.createElement('div');
        create_counties_table(country_code, country_name, state_name, counties_cell);
        // var row4 = document.createElement('div');
        // row4.appendChild(document.createElement('br'))
        // row4.className = 'row';
        // var padding_cell = document.createElement('div');
        // padding_cell.className = 'col-2 text-center';
        // row4.appendChild(padding_cell);
        // row4.appendChild(counties_table_cell);
        section.appendChild(counties_cell);
    } else {
        // create table of states
        var padding_cell = document.createElement('div');
        padding_cell.className = 'col-2 text-center';
        section.appendChild(padding_cell);
        var states_cell = document.createElement('div');
        states_cell.className = 'col-sm text-center';
        states_cell.id = 'table_container';
        create_states_table(country_name, states_cell);
        section.appendChild(states_cell);
    }
}

function display_county_content(county_name, state_name, country_code, country_name, country_name_label, section) {
    var row1 = document.createElement('div');
    row1.className = 'row';
    var row2 = document.createElement('div');
    row2.className = 'row';
    var row3 = document.createElement('div');
    row3.className = 'row';

    var daily_new_plot_cell = create_county_confirmed_cumulative_plot_cell(county_name, state_name, country_name, country_name_label);
    row1.appendChild(daily_new_plot_cell);
    section.appendChild(row1);

    var confirmed_plot_cell = create_county_confirmed_daily_plot_cell(county_name, state_name, country_name, country_name_label);
    var deaths_plot_cell = create_county_deaths_plot_cell(county_name, state_name, country_name, country_name_label);
    row2.appendChild(confirmed_plot_cell);
    row3.appendChild(deaths_plot_cell);
    section.appendChild(row2);
    section.appendChild(row3);

    countries[country_name].States[state_name].Counties
        // create table of counties
    var padding_cell = document.createElement('div');
    padding_cell.className = 'col-2 text-center';
    section.appendChild(padding_cell);
    var counties_cell = document.createElement('div');
    counties_cell.className = 'col-sm text-center';
    counties_cell.id = 'table_container';
    create_counties_table(country_code, country_name, state_name, counties_cell);
    section.appendChild(counties_cell);
}


// use country_name = 'World' to get world stats
function create_article(country_code, state_name, county_name, container_id) {
    var container = document.getElementById(container_id);
    var section = document.createElement('section');
    let country_name = country_iso2name[country_code];

    // set up page title
    var country_name_label = create_country_name_label(country_name, state_name, country_code, county_name);
    // section.innerHTML = `  <hr><h2 id='${country_code}'>${country_name_label}</h2><br>`;

    // row 1 - Here goes the Brief
    var summary_row = document.createElement('div');
    summary_row.className = 'row';
    // create brief content
    let summary_cell = create_summary_cell(country_code, country_name, country_name_label, state_name, county_name);
    summary_row.appendChild(summary_cell);
    section.appendChild(summary_row);
    section.appendChild(document.createElement('br'))
    section.appendChild(document.createElement('br'))
        // end brief

    if (is_empty(state_name))
        display_country_content(country_code, country_name, country_name_label, section);
    else if (is_empty(county_name))
        display_state_content(state_name, country_code, country_name, country_name_label, section);
    else
        display_county_content(county_name, state_name, country_code, country_name, country_name_label, section);

    section.id = `${country_code}_summary`;
    container.appendChild(section);
    container.appendChild(document.createElement('br'));
    container.appendChild(document.createElement('br'));
}

function create_counties_table(country_code, country_name, state_name, container) {
    var section = document.createElement('section');
    var row = document.createElement('div');
    row.appendChild(document.createElement('br'))
    row.className = 'row';
    var link_to_main = document.createElement('a');
    link_to_main.href = '#';
    link_to_main.addEventListener("click", function() {
        handle_selection(country_code, '', '');
    });
    link_to_main.innerText = `Back to ${country_name} main page`;
    var states_table_cell = document.createElement('div');
    states_table_cell.id = 'counties_table';
    states_table_cell.appendChild(document.createElement('br'));
    states_table_cell.appendChild(link_to_main);
    states_table_cell.appendChild(document.createElement('br'));
    states_table_cell.appendChild(document.createElement('br'));

    var header = document.createElement('h3');
    header.innerText = `Table of Counties in ${state_name}, ${country_name}`;
    states_table_cell.appendChild(header);
    states_table_cell.className = 'col-auto text-center';
    var states_table = document.createElement('table');
    var caption = document.createElement('caption');
    caption.innerText = `This table presents the list of all the counties in ${state_name}.`;
    states_table.appendChild(caption);
    var table_header = document.createElement('tr');
    table_header.innerHTML = `<th scope='col'> County </th> <th scope='col'>Total Infections</th><th scope='col'>Daily New Infections</th><th scope='col'>Total Deaths</th><th scope='col'>Daily New Deaths</th>`
    states_table.appendChild(table_header);
    for (s in countries[country_name].States[state_name].Counties) {
        var state_row = document.createElement('tr');
        state_row.innerHTML = `<th scope='row'><a href="#" onClick="handle_selection('${country_code}', '${state_name}', '${s}' )" title="jump to">${s}</a></th>
                                <td>${countries[country_name].States[state_name].Counties[s].confirmed_timeline.slice(-1)[0].toLocaleString()}</td>
                                <td>${countries[country_name].States[state_name].Counties[s].confirmed_daily.slice(-1)[0].toLocaleString()}</td>
                                <td>${countries[country_name].States[state_name].Counties[s].deaths_timeline.slice(-1)[0].toLocaleString()}</td>
                                <td>${countries[country_name].States[state_name].Counties[s].deaths_daily.slice(-1)[0].toLocaleString()}</td>`;
        states_table.appendChild(state_row);
    }
    states_table_cell.appendChild(states_table);
    var padding_cell = document.createElement('div');
    padding_cell.className = 'col-2 text-center';
    row.appendChild(padding_cell);
    row.appendChild(states_table_cell);
    section.appendChild(row);
    container.appendChild(section);
    // return states_table_cell;
}


function create_states_table(country_name, container) {
    var section = document.createElement('section');
    var row = document.createElement('div');
    row.appendChild(document.createElement('br'))
    row.className = 'row';
    var link_to_main = document.createElement('a');
    link_to_main.href = '#';
    link_to_main.addEventListener("click", function() {
        handle_selection(country_name2iso[country_name], '', '');
    });
    link_to_main.innerText = `Back to ${country_name} main page`;


    var states_table_cell = document.createElement('div');
    states_table_cell.id = 'states_table';
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
    caption.innerText = `This table presents the list of all the states in ${country_name}. For each state, we report new COVID-19 ` +
        `infections and deaths since the last update, together with the total number of infections and deaths since the beginning of the pandemic.`;
    states_table.appendChild(caption);
    var table_header = document.createElement('tr');
    table_header.innerHTML = `<th scope='col'> State </th> <th scope='col'>Total Infections</th><th scope='col'>Daily New Infections</th><th scope='col'>Total Deaths</th><th scope='col'>Daily New Deaths</th>`
    states_table.appendChild(table_header);
    var country_code = country_name2iso[country_name];
    for (s in countries[country_name].States) {
        var state_row = document.createElement('tr');
        state_row.innerHTML = `<th scope='row'><a href="#" onClick="handle_selection('${country_code}', '${s}', '')" title="jump to">${s}</a></th><td>${countries[country_name].States[s].confirmed_timeline.slice(-1)[0].toLocaleString()}</td>
                                                        <td>${countries[country_name].States[s].confirmed_daily.slice(-1)[0].toLocaleString()}</td>
                                                        <td>${countries[country_name].States[s].deaths_timeline.slice(-1)[0].toLocaleString()}</td>
                                                        <td>${countries[country_name].States[s].deaths_daily.slice(-1)[0].toLocaleString()}</td>`;
        states_table.appendChild(state_row);
    }
    states_table_cell.appendChild(states_table);
    var padding_cell = document.createElement('div');
    padding_cell.className = 'col-2 text-center';
    row.appendChild(padding_cell);
    row.appendChild(states_table_cell);
    section.appendChild(row);
    container.appendChild(section);

    // return states_table_cell;
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

            if (c == 'US' || c == 'China') {
                prepare_states(c);
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
                    } else {
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
        country_name2iso['China'] = 'CN';
        delete country_name2iso['Korea, South'];
        delete country_name2iso['US'];
        delete countries['US'];
        delete countries['Korea, South'];
        delete country_iso2name['MO'];
        // delete countries['Iran'];
        console.log('CRUNCHING DATA... OK!');
    }

    // notify that the data is ready to be used
    jQuery.event.trigger('dataReadyEvent');
}

function prepare_states(country_code) {
    var keys = (countries[country_code]['dates']);

    for (s in countries[country_code].States) {
        countries[country_code].States[s]['confirmed_timeline'] = [];
        countries[country_code].States[s]['confirmed_daily'] = [];
        countries[country_code].States[s]['deaths_timeline'] = [];
        countries[country_code].States[s]['deaths_daily'] = [];
        for (i = 0; i < countries[country_code]['dates'].length; i++) {
            countries[country_code].States[s]['confirmed_timeline'][i] = 0;
            countries[country_code].States[s]['deaths_timeline'][i] = 0;
            countries[country_code].States[s]['confirmed_daily'][i] = 0;
            countries[country_code].States[s]['deaths_daily'][i] = 0;
        }
        if (typeof countries[country_code].States[s].Counties !== 'undefined') {
            for (c = 0; c < Object.keys(countries[country_code].States[s].Counties).length; c++) {
                var county_name = Object.keys(countries[country_code].States[s].Counties)[c];
                countries[country_code].States[s].Counties[county_name]['confirmed_timeline'] = [];
                countries[country_code].States[s].Counties[county_name]['confirmed_daily'] = [];
                countries[country_code].States[s].Counties[county_name]['deaths_timeline'] = [];
                countries[country_code].States[s].Counties[county_name]['deaths_daily'] = [];
                for (i = 0; i < countries[country_code].dates.length; i++) {
                    countries[country_code].States[s].Counties[county_name]['confirmed_timeline'][i] = 0;
                    countries[country_code].States[s].Counties[county_name]['deaths_timeline'][i] = 0;
                    countries[country_code].States[s].Counties[county_name]['confirmed_daily'][i] = 0;
                    countries[country_code].States[s].Counties[county_name]['deaths_daily'][i] = 0;
                }
            }
        }
    }

    for (s in countries[country_code].States) {
        if (typeof countries[country_code].States[s].Counties !== 'undefined') {
            for (c = 0; c < Object.keys(countries[country_code].States[s].Counties).length; c++) {
                // console.log('>' + c + ', ' + Object.keys(countries[country_code].States[s].Counties)[c])
                let county_name = Object.keys(countries[country_code].States[s].Counties)[c];
                // create timeline and daily for each county
                let confirmed = countries[country_code].States[s].Counties[county_name].confirmed;
                let deaths = countries[country_code].States[s].Counties[county_name].deaths;

                for (i = 0; i < countries[country_code].dates.length; i++) {
                    // for (k in keys) {
                    countries[country_code].States[s].Counties[county_name]['confirmed_timeline'][i] += Number(confirmed[keys[i]]);
                    countries[country_code].States[s].Counties[county_name]['deaths_timeline'][i] += Number(deaths[keys[i]]);
                    countries[country_code].States[s]['confirmed_timeline'][i] += Number(confirmed[keys[i]]);
                    countries[country_code].States[s]['deaths_timeline'][i] += Number(deaths[keys[i]]);
                    // }
                    if (i == 0) {
                        // console.log(countries[c]['confirmed_daily'])
                        countries[country_code].States[s].Counties[county_name]['confirmed_daily'][i] = countries[country_code].States[s].Counties[county_name]['confirmed_timeline'][i];
                        countries[country_code].States[s].Counties[county_name]['deaths_daily'][i] = countries[country_code].States[s].Counties[county_name]['deaths_timeline'][i];
                        countries[country_code].States[s]['confirmed_daily'][i] = countries[country_code].States[s].Counties[county_name]['confirmed_timeline'][i];
                        countries[country_code].States[s]['deaths_daily'][i] = countries[country_code].States[s].Counties[county_name]['deaths_timeline'][i];
                    } else {
                        countries[country_code].States[s].Counties[county_name]['confirmed_daily'][i] += clip_to_zero(countries[country_code].States[s].Counties[county_name]['confirmed_timeline'][i] - countries[country_code].States[s].Counties[county_name]['confirmed_timeline'][i - 1]);
                        countries[country_code].States[s].Counties[county_name]['deaths_daily'][i] += clip_to_zero(countries[country_code].States[s].Counties[county_name]['deaths_timeline'][i] - countries[country_code].States[s].Counties[county_name]['deaths_timeline'][i - 1]);
                        countries[country_code].States[s]['confirmed_daily'][i] += clip_to_zero(countries[country_code].States[s].Counties[county_name]['confirmed_timeline'][i] - countries[country_code].States[s].Counties[county_name]['confirmed_timeline'][i - 1]);
                        countries[country_code].States[s]['deaths_daily'][i] += clip_to_zero(countries[country_code].States[s].Counties[county_name]['deaths_timeline'][i] - countries[country_code].States[s].Counties[county_name]['deaths_timeline'][i - 1]);
                    }
                }
            }
            // sum up timelines and assign to state
        } else {
            let confirmed = countries[country_code].States[s].confirmed;
            // console.log(confirmed)
            let deaths = countries[country_code].States[s].deaths;
            for (i = 0; i < countries[country_code].dates.length; i++) {
                // console.log("XX " + i);

                // for (i = 0; i < countries[country_code].dates.length; i++) {
                countries[country_code].States[s]['confirmed_timeline'][i] += Number(confirmed[0][keys[i]]);
                countries[country_code].States[s]['deaths_timeline'][i] += Number(deaths[0][keys[i]]);
                // }
                if (i == 0) {
                    // console.log(countries[c]['confirmed_daily'])
                    countries[country_code].States[s]['confirmed_daily'][i] = countries[country_code].States[s]['confirmed_timeline'][i];
                    countries[country_code].States[s]['deaths_daily'][i] = countries[country_code].States[s]['deaths_timeline'][i];
                } else {
                    countries[country_code].States[s]['confirmed_daily'][i] += clip_to_zero(countries[country_code].States[s]['confirmed_timeline'][i] - countries[country_code].States[s]['confirmed_timeline'][i - 1]);
                    countries[country_code].States[s]['deaths_daily'][i] += clip_to_zero(countries[country_code].States[s]['deaths_timeline'][i] - countries[country_code].States[s]['deaths_timeline'][i - 1]);
                }
            }
        }
    }
}

function generate_plot(canvas_elem, title, thickness, color, bgcolor, fill, mdata) {
    // var ctx = $('#active_cases_chart');
    var ctx = canvas_elem.getContext("2d");

    // Create gradient
    var gradientFill = ctx.createLinearGradient(1000, 1000, 0, 0);
    gradientFill.addColorStop(1, "rgba(0, 0, 0, 0.6)");
    gradientFill.addColorStop(0, bgcolor);


    var data = {
        labels: countries.World['dates'],
        datasets: [{
            label: title,
            data: mdata,
            // backgroundColor: bgcolor,
            borderColor: color,
            borderWidth: 3,
            fill: fill,
            lineTension: 0,
            radius: 1,
            fill: 'origin',
            backgroundColor: gradientFill,
            pointStyle: 'line'
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
        },

        tooltips: {
            mode: 'nearest'
        },

        scales: {
            xAxes: [{
                ticks: {
                    autoSkip: true,
                    fontSize: 22
                }

            }],
            yAxes: [{
                ticks: {
                    autoSkip: true,
                    fontSize: 22,
                    callback: function(value, index, values) {
                        new_value = value;
                        if (value >= 1e3 && value < 1e6)
                            new_value = value / 1e3 + 'K';
                        else if (value >= 1e6 && value < 1e9)
                            new_value = value / 1e6 + 'M';
                        else if (value >= 1e9)
                            new_value = value / 1e9 + 'B';
                        return new_value;
                    }

                }

            }]
        }
    };



    var chart = new Chart(canvas_elem, {
        type: "line",
        data: data,
        options: options,
        ticks: [autoSkip = true]
    });

}

// /////////////////////////////////////////////////////////////////////////////////////// \\
// /////////////////////////////////////////////////////////////////////////////////////// \\
// /////////////////////////////////////////////////////////////////////////////////////// \\
// /////////////////////////////////////////////////////////////////////////////////////// \\
// ******************************** DOM/UI ************************************************ \\
// /////////////////////////////////////////////////////////////////////////////////////// \\
// /////////////////////////////////////////////////////////////////////////////////////// \\
// /////////////////////////////////////////////////////////////////////////////////////// \\
// /////////////////////////////////////////////////////////////////////////////////////// \\

function add_button(text, form_id, container_elem, button_id, callback_string) {
    var form = document.createElement('div');
    // form.name = 'sonification_controls_form';
    form.name = form_id;
    form.id = form_id;
    form.innerHTML += `
    <legend id='son_controls_legend'>Sonification Options</legend>
    <ul aria-labelledby='son_controls_legend' role='group'>
        <li class='no-dot'>
          <input id="stereo_panning" type="checkbox" name="stereo_panning" value="Enable Stereo Panning"> 
          <label for="stereo_panning">Enable Stereo Panning</label>
          <input id="play_tickmark" type="checkbox" name="play_tickmark" value="Play 14 days mark" checked> 
          <label for="play_tickmark">Play 14 days mark</label>
        </li>
        <li class='no-dot'>
        <input id="play_reference_tone" type="checkbox" name="play_reference_tone" value="Alternate Baseline Tone">           
          <label for="play_reference_tone">Alternate Baseline Tone</label>
          <input id="play_reference_tone_unison" type="checkbox" name="play_reference_tone_unison" value="Unison Baseline Tone">
          <label for="play_reference_tone_unison">Unison Baseline Tone (overrides alternate)</label>
      </li>
    </ul>
    `;

    var b = document.createElement('button');
    b.id = button_id;
    b.innerHTML = text
    b.setAttribute('onclick', callback_string);
    form.appendChild(b);
    container_elem.appendChild(form);
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

function parse_reports_regions(res) {
    var data = d3.csvParse(res);
    for (d = 0; d < data.length; d++) {
        if (typeof(data[d]['Country_Region']) !== 'undefined') {
            // setup data structure the first time we encounter a country
            if (typeof(daily_report_regions[data[d]['Country_Region']]) === 'undefined') {
                daily_report_regions[data[d]['Country_Region']] = [];
                daily_report_regions[data[d]['Country_Region']]['Province_State'] = [];
            }
            // insert data into structure 
            //first, make distinction between US and not to handle counties vs regions
            if (data[d]['Country_Region'].localeCompare('US') == 0) {
                let country = data[d]['Country_Region'];
                let state = data[d]['Province_State'];
                let county = data[d]['Admin2'];
                if (typeof(daily_report_regions[country].Province_State[state]) === 'undefined') {
                    daily_report_regions[country].Province_State[state] = [];
                    daily_report_regions[country].Province_State[state]['County'] = [];
                }
                if (typeof(daily_report_regions[country].Province_State[state].County[county]) === 'undefined')
                    daily_report_regions[country].Province_State[state].County[county] = [];

                daily_report_regions[country].Province_State[state].County[county]['active'] = data[d].Active;
                daily_report_regions[country].Province_State[state].County[county]['recovered'] = data[d].Recovered;
                daily_report_regions[country].Province_State[state].County[county]['deaths'] = data[d].Deaths;
                daily_report_regions[country].Province_State[state].County[county]['case_fatality_ratio'] = data[d]['Case-Fatality_Ratio'];
                daily_report_regions[country].Province_State[state].County[county]['incidence_rate'] = data[d].Incidence_Rate;
                daily_report_regions[country].Province_State[state].County[county]['confirmed'] = data[d].Confirmed;
                daily_report_regions[country].Province_State[state].County[county]['last_update'] = data[d].Last_Update;

            } else {
                let country = data[d]['Country_Region'];
                let state = data[d]['Province_State'];
                if (typeof(daily_report_regions[country].Province_State[state]) === 'undefined')
                    daily_report_regions[country].Province_State[state] = [];

                daily_report_regions[country].Province_State[state]['active'] = data[d].Active;
                daily_report_regions[country].Province_State[state]['recovered'] = data[d].Recovered;
                daily_report_regions[country].Province_State[state]['deaths'] = data[d].Deaths;
                daily_report_regions[country].Province_State[state]['case_fatality_ratio'] = data[d]['Case-Fatality_Ratio'];
                daily_report_regions[country].Province_State[state]['incidence_rate'] = data[d].Incidence_Rate;
                daily_report_regions[country].Province_State[state]['confirmed'] = data[d].Confirmed;
                daily_report_regions[country].Province_State[state]['last_update'] = data[d].Last_Update;
            }
        }
    }
}

function parse_reports_us_states(res) {
    var data = d3.csvParse(res);
    for (d = 0; d < data.length; d++) {
        if (typeof(data[d]['Country_Region']) !== 'undefined') {
            // setup data structure the first time we encounter a country
            if (typeof(daily_report_us_states[data[d]['Province_State']]) === 'undefined') {
                daily_report_us_states[data[d]['Province_State']] = [];
            }

            let state = data[d]['Province_State'];
            if (typeof(daily_report_us_states[state]) === 'undefined')
                daily_report_us_states[state] = [];

            daily_report_us_states[state]['active'] = data[d].Active;
            daily_report_us_states[state]['recovered'] = data[d].Recovered;
            daily_report_us_states[state]['deaths'] = data[d].Deaths;
            daily_report_us_states[state]['case_fatality_ratio'] = data[d]['Case-Fatality_Ratio'];
            daily_report_us_states[state]['incidence_rate'] = data[d].Incident_Rate; // ahhh inconsistencies in the data source
            daily_report_us_states[state]['confirmed'] = data[d].Confirmed;
            daily_report_us_states[state]['last_update'] = data[d].Last_Update;
            daily_report_us_states[state]['people_tested'] = data[d].People_Tested;
            daily_report_us_states[state]['people_hospitalized'] = data[d].People_Hospitalized;
            daily_report_us_states[state]['mortality_rate'] = data[d].Mortality_Rate;
            daily_report_us_states[state]['testing_rate'] = data[d].Testing_Rate;
            daily_report_us_states[state]['hospitalization_rate'] = data[d].Hospitalization_Rate;


        }
    }
}

// /////////////////////////////////////////////////////////////////////////////////////// \\>
// /////////////////////////////////////////////////////////////////////////////////////// \\
// /////////////////////////////////////////////////////////////////////////////////////// \\
// /////////////////////////////////////////////////////////////////////////////////////// \\
// ******************************** UTILS ************************************************ \\
// //////////////////////////////////////////////////////////////////////////////////////// \\
// /////////////////////////////////////////////////////////////////////////////////////// \\
// /////////////////////////////////////////////////////////////////////////////////////// \\
// /////////////////////////////////////////////////////////////////////////////////////// \\


function is_empty(name) {
    return (name.localeCompare('') == 0 || name == undefined);
}

function get_element_inside_container(containerID, childID) {
    var elm = document.getElementById(childID);
    var parent = elm ? elm.parentNode : {};
    return (parent.id && parent.id === containerID) ? elm : {};
}

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
    minutes = minutes < 10 ? '0' + minutes : minutes;
    var strTime = hours + ':' + minutes + ' ' + ampm;
    return strTime;
}


const isToday = (in_date) => {
    const today = new Date()
    return (in_date.getDate() == today.getDate() &&
        in_date.getMonth() == today.getMonth() &&
        in_date.getFullYear() == today.getFullYear());
}

function getYesterdayDate() {
    var date = new Date();
    date.setDate(date.getDate() - 1);
    return date;
}

function getDate(dayOffset) {
    var date = new Date();
    date.setDate(date.getDate() - dayOffset);
    return date;
}

const date2DDMMYYYY = (date, separator) => {
    day = date.getDate();
    month = date.getMonth() + 1;
    if (parseInt(day) < 10)
        day = '0' + day;
    if (parseInt(month) < 10)
        month = '0' + month;
    var s_date = month + separator + day + separator + date.getFullYear();
    return s_date;
}

//moving average
function moving_average(data, n) {
    var out_data = [];
    for (i = 0; i < data.length; i++)
        out_data[i] = 0;
    cnt = Math.floor(n / 2);
    for (i = Math.floor(n / 2); i < data.length - n; i++) {
        acc = 0;
        for (j = i; j < i + n; j++)
            acc += data[j]
        out_data[cnt] = (1 / n) * acc;
        cnt++;
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
        } else if (a[prop] < b[prop]) {
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
        } else if (a.TotalConfirmed - (a.TotalRecovered + a.TotalDeaths) >
            b.TotalConfirmed - (b.TotalRecovered + b.TotalDeaths)) {
            return -1;
        }
        return 0;
    }
}

function timestamp_to_date(tstamp) {
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
// /////////////////////////////////////////////////////////////////////////////////////// \\
// /////////////////////////////////////////////////////////////////////////////////////// \\
// /////////////////////////////////////////////////////////////////////////////////////// \\
// /////////////////////////////////////////////////////////////////////////////////////// \\




function get_daily_report_regions(filename, dayOffset) {
    var progress = document.getElementById('fetching_progress');
    var in_url = daily_reports_base_url_local + filename;
    // retrieve daily reports for US states, counties and regions in other nations
    var settings = {
        "crossDomain": true,
        "url": in_url,
        "method": "GET",
        "dataType": "text"
    }
    $.ajax(settings).then(
        function(res) {
            // progress.value += 1;
            console.log("[OK] JHU DAILY REPORTS FOUND");
            // do something with the response
            parse_reports_regions(res);
            console.log(daily_report_regions)
            njobs--;
            progress.value += 1;
            if (njobs == 0) // all the async calls returned successfully
                prepare_data();
        },
        function() {
            console.log("[X] NO " + in_url);
            // date_string = date2DDMMYYYY(getYesterdayDate(), '-');
            date_string = date2DDMMYYYY(getDate(dayOffset + 1), '-');
            let filename = date_string + ".csv";
            get_daily_report_regions(filename, dayOffset + 1)
        });
}

function get_daily_report_us_state(filename, dayOffset) {
    var progress = document.getElementById('fetching_progress');
    var in_url = daily_reports_base_url_US_states + filename;
    // retrieve daily reports for US states, counties and regions in other nations
    var settings = {
        "crossDomain": true,
        "url": in_url,
        "method": "GET",
        "dataType": "text"
    }
    $.ajax(settings).then(
        function(res) {
            // progress.value += 1;
            console.log("[OK] JHU DAILY REPORTS US STATES FOUND");
            // do something with the response
            parse_reports_us_states(res);
            njobs--;
            progress.value++;
            if (njobs == 0) // all the async calls returned successfully
                prepare_data();
        },
        function() {
            console.log("[X] NO " + in_url);
            // date_string = date2DDMMYYYY(getYesterdayDate(), '-');
            // let filename = date_string + ".csv";
            // get_daily_report_us_state(filename)
            date_string = date2DDMMYYYY(getDate(dayOffset + 1), '-');
            let filename = date_string + ".csv";
            get_daily_report_us_state(filename, dayOffset + 1)
        });
}


function fetch_and_prepare_data_JHU() {

    var progress = document.getElementById('fetching_progress');
    progress.max = njobs;
    progress.value = 0;

    var date_string = date2DDMMYYYY(new Date(), '-');
    get_daily_report_regions(date_string + ".csv", 0);
    get_daily_report_us_state(date_string + ".csv", 0);

    var settings = {
        "crossDomain": true,
        "url": "https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/UID_ISO_FIPS_LookUp_Table.csv",
        "method": "GET",
        "dataType": "text",
    }
    $.ajax(settings).then(
        function(res) {
            var data = d3.csvParse(res);
            country_name2iso['World'] = 'World';
            country_iso2name['World'] = 'World';
            for (i = 0; i < data.length; i++) {
                country_name2iso[data[i]['Country_Region']] = data[i]['iso2'];
                country_iso2name[data[i]['iso2']] = data[i]['Country_Region'];
            }

            progress.value += 1;
            console.log("[OK] JHU ISO_TABLE")

            njobs--;
            if (njobs == 0)
                prepare_data();
        },
        function() {
            console.log("[!] JHU ISO_TABLE")
        });


    var settings = {
        "crossDomain": true,
        "url": "https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_time_series/time_series_covid19_confirmed_global.csv",
        "method": "GET",
        "dataType": "text"
    }
    $.ajax(settings).then(
        function(res) {
            var data = d3.csvParse(res);

            for (d = 0; d < data.length; d++) {
                if (typeof(data[d]['Country/Region']) !== 'undefined') {
                    // is it the first time we see this country? if so, initialize the array
                    if (typeof(countries[data[d]['Country/Region']]) === 'undefined') {
                        countries[data[d]['Country/Region']] = [];
                        countries[data[d]['Country/Region']]['States'] = [];
                    }

                    // country-wide data
                    if (typeof(countries[data[d]['Country/Region']]['confirmed']) === 'undefined') {
                        countries[data[d]['Country/Region']]["confirmed"] = [];
                    }
                    if (data[d]['Province/State'] !== '') {
                        if ((countries[data[d]['Country/Region']]['States'][data[d]['Province/State']] === undefined)) {
                            // console.log(countries[data[d]['Country/Region']]['States'][data[d]['Province/State']].length)
                            countries[data[d]['Country/Region']]['States'][data[d]['Province/State']] = [];
                        }
                        if (typeof(countries[data[d]['Country/Region']]['States'][data[d]['Province/State']]['confirmed'] === 'undefined')) {
                            countries[data[d]['Country/Region']]['States'][data[d]['Province/State']]['confirmed'] = [];
                        }
                    }

                    countries[data[d]['Country/Region']]['confirmed'][countries[data[d]['Country/Region']]["confirmed"].length] = data[d];

                    if ((data[d]['Province/State']) !== '') {
                        countries[data[d]['Country/Region']]['States'][data[d]['Province/State']]['confirmed'][countries[data[d]['Country/Region']]['States'][data[d]['Province/State']]['confirmed'].length] = data[d];
                    }
                }
            }
            progress.value += 1;
            console.log("[OK] JHU CONFIRMED_GLOBAL")

            njobs--;
            if (njobs == 0)
                prepare_data();
        },
        function() {
            console.log("[!] JHU CONFIRMED_GLOBAL")
        });

    var settings = {
        "crossDomain": true,
        "url": "https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_time_series/time_series_covid19_deaths_global.csv",
        "method": "GET",
        "dataType": "text"
    }
    $.ajax(settings).then(
        function(res) {
            var data = d3.csvParse(res);

            for (d = 0; d < data.length; d++) {
                if (typeof(data[d]['Country/Region']) !== 'undefined') {
                    // is it the first time we see this country? if so, initialize the array
                    if (typeof(countries[data[d]['Country/Region']]) === 'undefined') {
                        countries[data[d]['Country/Region']] = [];
                        countries[data[d]['Country/Region']]['States'] = [];
                    }

                    // country-wide data
                    if (typeof(countries[data[d]['Country/Region']]['deaths']) === 'undefined') {
                        countries[data[d]['Country/Region']]["deaths"] = [];
                    }
                    if (data[d]['Province/State'] !== '') {
                        if ((countries[data[d]['Country/Region']]['States'][data[d]['Province/State']] === undefined)) {
                            countries[data[d]['Country/Region']]['States'][data[d]['Province/State']] = [];
                        }
                        if ((countries[data[d]['Country/Region']]['States'][data[d]['Province/State']]['deaths'] === undefined)) {
                            countries[data[d]['Country/Region']]['States'][data[d]['Province/State']]['deaths'] = [];
                        }
                    }

                    countries[data[d]['Country/Region']]['deaths'][countries[data[d]['Country/Region']]["deaths"].length] = data[d];

                    if ((data[d]['Province/State']) !== '') {
                        countries[data[d]['Country/Region']]['States'][data[d]['Province/State']]['deaths'][countries[data[d]['Country/Region']]['States'][data[d]['Province/State']]['deaths'].length] = data[d];
                    }
                }
            }
            progress.value += 1;
            console.log("[OK] JHU DEATHS_GLOBAL")

            njobs--;
            if (njobs == 0)
                prepare_data();
        },
        function() {
            console.log("[!] JHU DEATHS_GLOBAL")
        });


    var settings = {
        "crossDomain": true,
        "url": "https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_time_series/time_series_covid19_recovered_global.csv",
        "method": "GET",
        "dataType": "text"
    }

    $.ajax(settings).then(
        function(res) {
            var data = d3.csvParse(res);
            for (d = 0; d < data.length; d++) {
                if (typeof(data[d]['Country/Region']) !== 'undefined') {
                    // is it the first time we see this country? if so, initialize the array
                    if (typeof(countries[data[d]['Country/Region']]) === 'undefined') {
                        countries[data[d]['Country/Region']] = [];
                        countries[data[d]['Country/Region']]['States'] = [];
                    }

                    // country-wide data
                    if (typeof(countries[data[d]['Country/Region']]['recovered']) === 'undefined') {
                        countries[data[d]['Country/Region']]["recovered"] = [];
                    }
                    if (data[d]['Province/State'] !== '') {
                        if ((countries[data[d]['Country/Region']]['States'][data[d]['Province/State']] === undefined)) {
                            countries[data[d]['Country/Region']]['States'][data[d]['Province/State']] = [];
                        }
                        if ((countries[data[d]['Country/Region']]['States'][data[d]['Province/State']]['recovered'] === undefined)) {
                            countries[data[d]['Country/Region']]['States'][data[d]['Province/State']]['recovered'] = [];
                        }
                    }

                    countries[data[d]['Country/Region']]['recovered'][countries[data[d]['Country/Region']]["recovered"].length] = data[d];

                    if ((data[d]['Province/State']) !== '') {
                        countries[data[d]['Country/Region']]['States'][data[d]['Province/State']]['recovered'][countries[data[d]['Country/Region']]['States'][data[d]['Province/State']]['recovered'].length] = data[d];
                    }
                }
            }
            progress.value += 1;
            console.log("[OK] JHU RECOVERED_GLOBAL")
            njobs--;
            if (njobs == 0)
                prepare_data();
        },
        function() {
            console.log("[!] JHU RECOVERED_GLOBAL");
        });


    ///// ||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||| \\\\\\
    ///// **********************  US data fetching starts here *********************************  \\\\\\\
    ///// ||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||| \\\\\\\\

    var settings = {
        "crossDomain": true,
        "url": "https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_time_series/time_series_covid19_confirmed_US.csv",
        "method": "GET",
        "dataType": "text"
    }
    $.ajax(settings).then(
        function(res) {
            var data = d3.csvParse(res);
            // console.log(data)
            for (d = 0; d < data.length; d++) {
                if (typeof(data[d]['Country_Region']) !== 'undefined') {
                    if (typeof(countries[data[d]['Country_Region']]) === 'undefined') {
                        countries[data[d]['Country_Region']] = [];
                        countries[data[d]['Country_Region']]['States'] = [];
                        countries[data[d]['Country_Region']]['States']['Counties'] = [];
                    }

                    if (typeof(countries[data[d]['Country_Region']]['States'][data[d]['Province_State']]) === 'undefined') {
                        countries[data[d]['Country_Region']]['States'][data[d]['Province_State']] = [];
                        countries[data[d]['Country_Region']]['States'][data[d]['Province_State']]['confirmed'] = [];
                        if (countries[data[d]['Country_Region']]['States'][data[d]['Province_State']]['Counties'] == undefined) {
                            countries[data[d]['Country_Region']]['States'][data[d]['Province_State']]['Counties'] = [];
                        }
                    }
                    let county = data[d]['Admin2'];
                    if (county.substring(0, 6).localeCompare('Out of') != 0 && county.localeCompare('Unassigned') != 0 && county.localeCompare('') != 0) {
                        if (countries[data[d]['Country_Region']]['States'][data[d]['Province_State']]['Counties'][data[d]['Admin2']] == undefined) {
                            countries[data[d]['Country_Region']]['States'][data[d]['Province_State']]['Counties'][data[d]['Admin2']] = [];
                        }
                        countries[data[d]['Country_Region']]['States'][data[d]['Province_State']]['Counties'][data[d]['Admin2']]['confirmed'] = data[d];
                    } else if (county.localeCompare('') == 0) {
                        countries[data[d]['Country_Region']]['States'][data[d]['Province_State']]['confirmed'] = data[d];
                    }
                }
            }
            progress.value += 1;
            console.log("[OK] JHU CONFIRMED_US")

            njobs--;
            if (njobs == 0)
                prepare_data();
        },
        function() {
            console.log("[!] JHU CONFIRMED_US")
        });

    var settings = {
        "crossDomain": true,
        "url": "https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_time_series/time_series_covid19_deaths_US.csv",
        "method": "GET",
        "dataType": "text"
    }
    $.ajax(settings).then(
        function(res) {
            var data = d3.csvParse(res);
            for (d = 0; d < data.length; d++) {
                if (typeof(data[d]['Country_Region']) !== 'undefined') {
                    if (typeof(countries[data[d]['Country_Region']]) === 'undefined') {
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
                    if (county.substring(0, 6).localeCompare('Out of') != 0 && county.localeCompare('Unassigned') != 0 && county.localeCompare('') != 0) {
                        // console.log('Insert county ' + county)
                        if (countries[data[d]['Country_Region']]['States'][data[d]['Province_State']]['Counties'][data[d]['Admin2']] == undefined) {
                            countries[data[d]['Country_Region']]['States'][data[d]['Province_State']]['Counties'][data[d]['Admin2']] = [];
                        }
                        countries[data[d]['Country_Region']]['States'][data[d]['Province_State']]['Counties'][data[d]['Admin2']]['deaths'] = data[d];
                    } else if (county.localeCompare('') == 0) {
                        countries[data[d]['Country_Region']]['States'][data[d]['Province_State']]['deaths'] = data[d];
                    }
                }
            }
            progress.value += 1;
            console.log("[OK] JHU DEATHS_US")

            njobs--;
            if (njobs == 0)
                prepare_data();
        },
        function() {
            console.log("[!] JHU DEATHS_US")
        });
}



/**/ //////////////////////////////////////////////////////////**/
/* *********** BEN :: separator for data fetch *************** */
/**/ //////////////////////////////////////////////////////////**/
//temporarily also transporting 'res' param to still use the 2 functions available for parsing
// const stringRuler = (string, res) => {
//     if (string.length === 112) {
//         console.log("[OK] JHU DAILY REPORTS FOUND");
//         parse_reports_regions(res); /*console.log(daily_report_regions);*/
//     } //BEN :: spared regions array from output but left it in place
//     else {
//         console.log("[OK] JHU DAILY REPORTS US STATES FOUND");
//         parse_reports_us_states(res); /*console.log(daily_report_us_states);*/
//     } //BEN :: spared regions array from output but left it in place
// };
// const stringRuler_NO = (string) => {
//     if (string.length === 112) { console.log("[X] NO - JHU DAILY REPORTS FOUND " + string); } else { console.log("[X] NO - JHU DAILY REPORTS US STATES FOUND " + string); }
// };

// function get_daily_reports(filename, dayOffset) {
//     var progress = document.getElementById('fetching_progress');
//     const daily_reports = daily_reports_base_URL.values();
//     for (let item of daily_reports) {
//         var in_url = item + filename;
//         var settings = {
//             "crossDomain": true,
//             "url": in_url,
//             "method": "GET",
//             "dataType": "text"
//         }
//         $.ajax(settings).then(
//             function(res) {
//                 // stringRuler(item, res);
//                 // do something with the response
//                 parse_reports_regions(res); // BEN :: !!!! make it 1 function for both !!!! meanwhile controlled by stringRuler(), line 22
//                 njobs--;
//                 progress.value += 1;
//                 if (njobs == 0) // all the async calls returned successfully                    
//                     prepare_data(); // BEN :: see line 1066!
//             },
//             function() {
//                 // console.log("[III]  offset " + dayOffset); // BEN :: set off for testing func() solution
//                 // stringRuler_NO(item);
//                 date_string = date2DDMMYYYY(getDate(dayOffset + 1), '-');
//                 let filename = date_string + ".csv";
//                 get_daily_reports(filename, dayOffset + 1)
//             }
//         );
//     }
// };
// /**/ //////////////////////////////////////////////////////////**/

// function fetch_and_prepare_data_JHU() {

//     var progress = document.getElementById('fetching_progress');
//     progress.max = njobs;
//     progress.value = 0;

//     var date_string = date2DDMMYYYY(new Date(), '-'); // BEN :: timezone clipping - i doubt there's a report for actually 'today', should be more like getYesterdayDate()
//     // var date_string = date2DDMMYYYY(getYesterdayDate(), '-');

//     // // // // BEN :: turn request functions on and off
//     //get_daily_report_regions(date_string + ".csv");
//     //get_daily_report_us_state(date_string + ".csv");
//     get_daily_reports(date_string + ".csv", 0);

//     var settings = {
//         "crossDomain": true,
//         "url": "https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/UID_ISO_FIPS_LookUp_Table.csv",
//         "method": "GET",
//         "dataType": "text",
//     }
//     $.ajax(settings).then(
//         function(res) {
//             var data = d3.csvParse(res);
//             country_name2iso['World'] = 'World';
//             country_iso2name['World'] = 'World';
//             for (i = 0; i < data.length; i++) {
//                 country_name2iso[data[i]['Country_Region']] = data[i]['iso2'];
//                 country_iso2name[data[i]['iso2']] = data[i]['Country_Region'];
//             }

//             progress.value += 1;
//             console.log("[OK] JHU ISO_TABLE")

//             njobs--;
//             if (njobs == 0)
//                 prepare_data();
//         },
//         function() {
//             console.log("[!] JHU ISO_TABLE")
//         });


//     var settings = {
//         "crossDomain": true,
//         "url": "https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_time_series/time_series_covid19_confirmed_global.csv",
//         "method": "GET",
//         "dataType": "text"
//     }
//     $.ajax(settings).then(
//         function(res) {
//             var data = d3.csvParse(res);

//             for (d = 0; d < data.length; d++) {
//                 if (typeof(data[d]['Country/Region']) !== 'undefined') {
//                     // is it the first time we see this country? if so, initialize the array
//                     if (typeof(countries[data[d]['Country/Region']]) === 'undefined') {
//                         countries[data[d]['Country/Region']] = [];
//                         countries[data[d]['Country/Region']]['States'] = [];
//                     }

//                     // country-wide data
//                     if (typeof(countries[data[d]['Country/Region']]['confirmed']) === 'undefined') {
//                         countries[data[d]['Country/Region']]["confirmed"] = [];
//                     }
//                     if (data[d]['Province/State'] !== '') {
//                         if ((countries[data[d]['Country/Region']]['States'][data[d]['Province/State']] === undefined)) {
//                             // console.log(countries[data[d]['Country/Region']]['States'][data[d]['Province/State']].length)
//                             countries[data[d]['Country/Region']]['States'][data[d]['Province/State']] = [];
//                         }
//                         if (typeof(countries[data[d]['Country/Region']]['States'][data[d]['Province/State']]['confirmed'] === 'undefined')) {
//                             countries[data[d]['Country/Region']]['States'][data[d]['Province/State']]['confirmed'] = [];
//                         }
//                     }

//                     countries[data[d]['Country/Region']]['confirmed'][countries[data[d]['Country/Region']]["confirmed"].length] = data[d];

//                     if ((data[d]['Province/State']) !== '') {
//                         countries[data[d]['Country/Region']]['States'][data[d]['Province/State']]['confirmed'][countries[data[d]['Country/Region']]['States'][data[d]['Province/State']]['confirmed'].length] = data[d];
//                     }
//                 }
//             }
//             progress.value += 1;
//             console.log("[OK] JHU CONFIRMED_GLOBAL")

//             njobs--;
//             if (njobs == 0)
//                 prepare_data();
//         },
//         function() {
//             console.log("[!] JHU CONFIRMED_GLOBAL")
//         });

//     var settings = {
//         "crossDomain": true,
//         "url": "https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_time_series/time_series_covid19_deaths_global.csv",
//         "method": "GET",
//         "dataType": "text"
//     }
//     $.ajax(settings).then(
//         function(res) {
//             var data = d3.csvParse(res);

//             for (d = 0; d < data.length; d++) {
//                 if (typeof(data[d]['Country/Region']) !== 'undefined') {
//                     // is it the first time we see this country? if so, initialize the array
//                     if (typeof(countries[data[d]['Country/Region']]) === 'undefined') {
//                         countries[data[d]['Country/Region']] = [];
//                         countries[data[d]['Country/Region']]['States'] = [];
//                     }

//                     // country-wide data
//                     if (typeof(countries[data[d]['Country/Region']]['deaths']) === 'undefined') {
//                         countries[data[d]['Country/Region']]["deaths"] = [];
//                     }
//                     if (data[d]['Province/State'] !== '') {
//                         if ((countries[data[d]['Country/Region']]['States'][data[d]['Province/State']] === undefined)) {
//                             countries[data[d]['Country/Region']]['States'][data[d]['Province/State']] = [];
//                         }
//                         if ((countries[data[d]['Country/Region']]['States'][data[d]['Province/State']]['deaths'] === undefined)) {
//                             countries[data[d]['Country/Region']]['States'][data[d]['Province/State']]['deaths'] = [];
//                         }
//                     }

//                     countries[data[d]['Country/Region']]['deaths'][countries[data[d]['Country/Region']]["deaths"].length] = data[d];

//                     if ((data[d]['Province/State']) !== '') {
//                         countries[data[d]['Country/Region']]['States'][data[d]['Province/State']]['deaths'][countries[data[d]['Country/Region']]['States'][data[d]['Province/State']]['deaths'].length] = data[d];
//                     }
//                 }
//             }
//             progress.value += 1;
//             console.log("[OK] JHU DEATHS_GLOBAL")

//             njobs--;
//             if (njobs == 0)
//                 prepare_data();
//         },
//         function() {
//             console.log("[!] JHU DEATHS_GLOBAL")
//         });


//     var settings = {
//         "crossDomain": true,
//         "url": "https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_time_series/time_series_covid19_recovered_global.csv",
//         "method": "GET",
//         "dataType": "text"
//     }

//     $.ajax(settings).then(
//         function(res) {
//             var data = d3.csvParse(res);
//             for (d = 0; d < data.length; d++) {
//                 if (typeof(data[d]['Country/Region']) !== 'undefined') {
//                     // is it the first time we see this country? if so, initialize the array
//                     if (typeof(countries[data[d]['Country/Region']]) === 'undefined') {
//                         countries[data[d]['Country/Region']] = [];
//                         countries[data[d]['Country/Region']]['States'] = [];
//                     }

//                     // country-wide data
//                     if (typeof(countries[data[d]['Country/Region']]['recovered']) === 'undefined') {
//                         countries[data[d]['Country/Region']]["recovered"] = [];
//                     }
//                     if (data[d]['Province/State'] !== '') {
//                         if ((countries[data[d]['Country/Region']]['States'][data[d]['Province/State']] === undefined)) {
//                             countries[data[d]['Country/Region']]['States'][data[d]['Province/State']] = [];
//                         }
//                         if ((countries[data[d]['Country/Region']]['States'][data[d]['Province/State']]['recovered'] === undefined)) {
//                             countries[data[d]['Country/Region']]['States'][data[d]['Province/State']]['recovered'] = [];
//                         }
//                     }

//                     countries[data[d]['Country/Region']]['recovered'][countries[data[d]['Country/Region']]["recovered"].length] = data[d];

//                     if ((data[d]['Province/State']) !== '') {
//                         countries[data[d]['Country/Region']]['States'][data[d]['Province/State']]['recovered'][countries[data[d]['Country/Region']]['States'][data[d]['Province/State']]['recovered'].length] = data[d];
//                     }
//                 }
//             }
//             progress.value += 1;
//             console.log("[OK] JHU RECOVERED_GLOBAL")
//             njobs--;
//             if (njobs == 0)
//                 prepare_data();
//         },
//         function() {
//             console.log("[!] JHU RECOVERED_GLOBAL");
//         });


//     ///// ||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||| \\\\\\
//     ///// **********************  US data fetching starts here *********************************  \\\\\\\
//     ///// ||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||| \\\\\\\\

//     var settings = {
//         "crossDomain": true,
//         "url": "https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_time_series/time_series_covid19_confirmed_US.csv",
//         "method": "GET",
//         "dataType": "text"
//     }
//     $.ajax(settings).then(
//         function(res) {
//             var data = d3.csvParse(res);
//             // console.log(data)
//             for (d = 0; d < data.length; d++) {
//                 if (typeof(data[d]['Country_Region']) !== 'undefined') {
//                     if (typeof(countries[data[d]['Country_Region']]) === 'undefined') {
//                         countries[data[d]['Country_Region']] = [];
//                         countries[data[d]['Country_Region']]['States'] = [];
//                         countries[data[d]['Country_Region']]['States']['Counties'] = [];
//                     }

//                     if (typeof(countries[data[d]['Country_Region']]['States'][data[d]['Province_State']]) === 'undefined') {
//                         countries[data[d]['Country_Region']]['States'][data[d]['Province_State']] = [];
//                         countries[data[d]['Country_Region']]['States'][data[d]['Province_State']]['confirmed'] = [];
//                         if (countries[data[d]['Country_Region']]['States'][data[d]['Province_State']]['Counties'] == undefined) {
//                             countries[data[d]['Country_Region']]['States'][data[d]['Province_State']]['Counties'] = [];
//                         }
//                     }
//                     let county = data[d]['Admin2'];
//                     if (county.substring(0, 6).localeCompare('Out of') != 0 && county.localeCompare('Unassigned') != 0 && county.localeCompare('') != 0) {
//                         if (countries[data[d]['Country_Region']]['States'][data[d]['Province_State']]['Counties'][data[d]['Admin2']] == undefined) {
//                             countries[data[d]['Country_Region']]['States'][data[d]['Province_State']]['Counties'][data[d]['Admin2']] = [];
//                         }
//                         countries[data[d]['Country_Region']]['States'][data[d]['Province_State']]['Counties'][data[d]['Admin2']]['confirmed'] = data[d];
//                     } else if (county.localeCompare('') == 0) {
//                         countries[data[d]['Country_Region']]['States'][data[d]['Province_State']]['confirmed'] = data[d];
//                     }
//                 }
//             }
//             progress.value += 1;
//             console.log("[OK] JHU CONFIRMED_US")

//             njobs--;
//             if (njobs == 0)
//                 prepare_data();
//         },
//         function() {
//             console.log("[!] JHU CONFIRMED_US")
//         });

//     var settings = {
//         "crossDomain": true,
//         "url": "https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_time_series/time_series_covid19_deaths_US.csv",
//         "method": "GET",
//         "dataType": "text"
//     }
//     $.ajax(settings).then(
//         function(res) {
//             var data = d3.csvParse(res);
//             for (d = 0; d < data.length; d++) {
//                 if (typeof(data[d]['Country_Region']) !== 'undefined') {
//                     if (typeof(countries[data[d]['Country_Region']]) === 'undefined') {
//                         countries[data[d]['Country_Region']] = [];
//                         countries[data[d]['Country_Region']]['deaths'] = [];
//                         countries[data[d]['Country_Region']]['States'] = [];
//                         countries[data[d]['Country_Region']]['States']['Counties'] = [];
//                     }

//                     if ((countries[data[d]['Country_Region']]['States'][data[d]['Province_State']]) == undefined)
//                         countries[data[d]['Country_Region']]['States'][data[d]['Province_State']] = [];
//                     if (countries[data[d]['Country_Region']]['States'][data[d]['Province_State']]['deaths'] == undefined)
//                         countries[data[d]['Country_Region']]['States'][data[d]['Province_State']]['deaths'] = [];

//                     if (countries[data[d]['Country_Region']]['States'][data[d]['Province_State']]['Counties'] == undefined)
//                         countries[data[d]['Country_Region']]['States'][data[d]['Province_State']]['Counties'] = [];


//                     let county = data[d]['Admin2'];
//                     // console.log('Data: ' + county)
//                     if (county.substring(0, 6).localeCompare('Out of') != 0 && county.localeCompare('Unassigned') != 0 && county.localeCompare('') != 0) {
//                         // console.log('Insert county ' + county)
//                         if (countries[data[d]['Country_Region']]['States'][data[d]['Province_State']]['Counties'][data[d]['Admin2']] == undefined) {
//                             countries[data[d]['Country_Region']]['States'][data[d]['Province_State']]['Counties'][data[d]['Admin2']] = [];
//                         }
//                         countries[data[d]['Country_Region']]['States'][data[d]['Province_State']]['Counties'][data[d]['Admin2']]['deaths'] = data[d];
//                     } else if (county.localeCompare('') == 0) {
//                         countries[data[d]['Country_Region']]['States'][data[d]['Province_State']]['deaths'] = data[d];
//                     }
//                 }
//             }
//             progress.value += 1;
//             console.log("[OK] JHU DEATHS_US")

//             njobs--;
//             if (njobs == 0)
//                 prepare_data();
//         },
//         function() {
//             console.log("[!] JHU DEATHS_US")
//         });
// }