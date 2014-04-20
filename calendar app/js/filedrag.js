(function() {

	function $id(id) {
		return document.getElementById(id);
	}

	function Output(msg) {
		var m = $id("messages");
		m.innerHTML += msg;
	}

	function Callicalendar(text) {
		
		icalParser.parseIcal(text);

		//icalParser.ical is now set
		icalParser.ical.version; 
		icalParser.ical.prodid;
		
	 for(var key in icalParser.ical.events)
	 {
         console.log("------");
		 console.log("Event N°"+key+ " : ");
	     console.log("DSTART VALUE : " +icalParser.ical.events[key].dtstart['value']);
	     console.log("DSTAMP VALUE : " +icalParser.ical.events[key].dtstamp['value']);
	     console.log("DTEND VALUE : " +icalParser.ical.events[key].dtend['value']);
	     console.log("UID VALUE : " +icalParser.ical.events[key].uid['value']);
         console.log("------");	 
	 }	
	}


	// file drag hover
	function FileDragHover(e) {
		e.stopPropagation();
		e.preventDefault();
		e.target.className = (e.type == "dragover" ? "hover" : "");
		
	}


	// file selection
	function FileSelectHandler(e) {

		// cancel event and hover styling
		FileDragHover(e);

		// fetch FileList object
		var files = e.target.files || e.dataTransfer.files;

		// process all File objects
		for (var i = 0, f; f = files[i]; i++) {
			getCalendar(f);
		}

	}

	function getCalendar(file)
	{
	var ext = file.name.split(".").pop().toLowerCase();
	var selectedFile = file;
	var reader = new FileReader();
    reader.readAsText(selectedFile);
	 console.log("ok 1");
	reader.onload = function() {
	   var  doc = reader.result;
	  // console.log(doc);
		Callicalendar(doc);
		Output("<p><strong>" + file.name + "</strong>");
	};
	}
	
	// initialize
	function Init() {

		var fileselect = $id("fileselect"),
			submitbutton = $id("submitbutton");
		// file select
		fileselect.addEventListener("change", FileSelectHandler, false);
		var xhr = new XMLHttpRequest();
		if (xhr.upload) {
			// remove submit button
			submitbutton.style.display = "none";
		}

	}

	// call initialization file
	if (window.File && window.FileList && window.FileReader) {
		Init();
	}

})();