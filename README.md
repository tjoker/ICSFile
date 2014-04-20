ICSFile
=======

Import of ICS Files in the agenda of Firefox OS :  

----------------------------
IcsFileParser :

 IcsFileParser allow parses iCalendar formatted text and returns javascript arrays of objects. 
 The parser respect the RFC 2445 and 5545 Internet Calendaring and Scheduling Core Object Specification ( iCalendar )
 
How to use it : 
 
icalParser.parseIcal(ical_formatted_text);

//icalParser.ical is now set
icalParser.ical.version; 
icalParser.ical.prodid;

////Arrays
//All the vevent elements
icalParser.ical.events;
//All the vtodo elements
icalParser.ical.todos;
//All the journal elements
icalParser.ical.journals;
//All the freebusy elements
icalParser.ical.freebusy;
----------------------------
in action 


icalParser.parseIcal(ical_formatted_text);

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







-----------

