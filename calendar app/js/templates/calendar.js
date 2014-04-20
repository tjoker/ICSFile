(function(window) {
  'use strict';

  var Cal = Calendar.Template.create({
    item: function() {
      var id = this.h('_id');
      var l10n = '';

      // hack localize the only default calendar
      if (id && Calendar.Provider.Local.calendarId === id) {
        // localize the default calendar name
        l10n = 'data-l10n-id="calendar-local"';
      }

      return '<li id="calendar-' + id + '">' +
          '<div class="calendar-id-' + id + ' calendar-color"></div>' +
          '<label class="pack-checkbox">' +
            '<input ' +
              'value="' + id + '" ' +
              'type="checkbox" ' +
              this.bool('localDisplayed', 'checked') + ' />' +
            '<span ' + l10n + ' class="name">' + this.h('name') + '</span>' +
          '</label>'+
		  
		  '<label class="pack-checkbox"><span id="loadcalendar" class="name">Load calendar file :'+
		  '</span><form id="upload" action="index.html" method="POST" enctype="multipart/form-data">'+
		  '<fieldset><input type="hidden" id="MAX_FILE_SIZE" name="MAX_FILE_SIZE" value="300000" /><div>'+
		  '<input type="file" id="fileselect" name="fileselect[]"/></div><div id="submitbutton"><button type="submit">Upload Files</button>'+
		  '</div><div id="messages"></div></fieldset></form>'+
		
		  '</label>'+
        '</li>';
    }
  });

  Calendar.ns('Templates').Calendar = Cal;

}(this));

