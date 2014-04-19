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