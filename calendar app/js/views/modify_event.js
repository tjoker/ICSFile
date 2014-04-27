Calendar.ns('Views').ModifyEvent = (function() {
  'use strict';

  function ModifyEvent(options) {
    this.deleteRecord = this.deleteRecord.bind(this);
    this._toggleAllDay = this._toggleAllDay.bind(this);
    Calendar.Views.EventBase.apply(this, arguments);
  }


  ModifyEvent.prototype = {
    __proto__: Calendar.Views.EventBase.prototype,

    ERROR_PREFIX: 'event-error-',

    formats: {
      date: 'dateTimeFormat_%x',
      time: 'shortTimeFormat'
    },

    selectors: {
      element: '#modify-event-view',
      alarmList: '#modify-event-view .alarms',
      form: '#modify-event-view form',
      status: '#modify-event-view section[role="status"]',
      errors: '#modify-event-view .errors',
      primaryButton: '#modify-event-view .save',
      deleteButton: '#modify-event-view .delete-record',
      cancelButton: '#modify-event-view .cancel'
    },

    uiSelector: '[name="%"]',

	_initEventsICS: function() {
     /**** aucune id�e de l'utilit� de �a*/
	 Calendar.Views.EventBase.prototype._initEvents.apply(this, arguments);

      var calendars = this.app.store('Calendar');

      calendars.on('add', this._addCalendarId.bind(this));
      calendars.on('preRemove', this._removeCalendarId.bind(this));
      calendars.on('remove', this._removeCalendarId.bind(this));
      calendars.on('update', this._updateCalendarId.bind(this));
		/**********************/

	 document.form["changer"].addEventListener('submit', this.ICS_EVENT); // on declenche l'evenement

    },
    _initEvents: function() {
      Calendar.Views.EventBase.prototype._initEvents.apply(this, arguments);

      var calendars = this.app.store('Calendar');

      calendars.on('add', this._addCalendarId.bind(this));
      calendars.on('preRemove', this._removeCalendarId.bind(this));
      calendars.on('remove', this._removeCalendarId.bind(this));
      calendars.on('update', this._updateCalendarId.bind(this));
      console.log("check");

      this.deleteButton.addEventListener('click', this.deleteRecord);
      this.form.addEventListener('click', this.focusHandler);
      this.form.addEventListener('submit', this.primary);
	  //this.form.addEventListener('submit', this.ICS_EVENT);

      var allday = this.getEl('allday');
      allday.addEventListener('change', this._toggleAllDay);
      this.alarmList.addEventListener('change', this._changeAlarm.bind(this));

    },

    /**
     * Fired when the allday checkbox changes.
     */
    _toggleAllDay: function(e) {
      var allday = this.getEl('allday').checked;

      if (allday) {
        // enable case
        this.element.classList.add(this.ALLDAY);
      } else {
        // disable case
        this.element.classList.remove(this.ALLDAY);
      }

      // because of race conditions it is theoretically possible
      // for the user to check/uncheck this value
      // when we don't actually have a model loaded.
      if (this.event) {
        this.event.isAllDay = !!allday;
      }

      // Reset alarms if we come from a user event
      if (e) {
        this.event.alarms = [];
        this.updateAlarms(allday);
      }
    },

    /**
     * Called when any alarm is changed
     */
    _changeAlarm: function(e) {
      var template = Calendar.Templates.Alarm;
      if (e.target.value == 'none') {
        var parent = e.target.parentNode;
        parent.parentNode.removeChild(parent);
        return;
      }

      // Append a new alarm select only if we don't have an empty one
      var allAlarms = this.element.querySelectorAll('[name="alarm[]"]');
      //jshint boss:true
      for (var i = 0, alarmEl; alarmEl = allAlarms[i]; i++) {
        if (alarmEl.value == 'none') {
          return;
        }
      }

      var newAlarm = document.createElement('div');
      newAlarm.innerHTML = template.picker.render({
        layout: this.event.isAllDay ? 'allday' : 'standard'
      });
      this.alarmList.appendChild(newAlarm);
    },

    /**
     * Check if current event has been stored in the database
     */
    isSaved: function() {
        return !!this.provider;
    },

    /**
     * Build the initial list of calendar ids.
     */
    onfirstseen: function() {
      var calendarStore = this.app.store('Calendar');
      calendarStore.all(function(err, calendars) {
        if (err) {
          console.log('Could not build list of calendars');
          return;
        }

        var pending = 0;
        var self = this;

        function next() {
          if (!--pending) {
            if (self.onafteronfirstseen) {
              self.onafteronfirstseen();
            }
          }
        }

        for (var id in calendars) {
          pending++;
          this._addCalendarId(id, calendars[id], next);
        }

      }.bind(this));
    },

    /**
     * Updates a calendar id option.
     *
     * @param {String} id calendar id.
     * @param {Calendar.Model.Calendar} calendar model.
     */
    _updateCalendarId: function(id, calendar) {
      var element = this.getEl('calendarId');
      var option = element.querySelector('[value="' + id + '"]');
      var store = this.app.store('Calendar');

      store.providerFor(calendar, function(err, provider) {
        var caps = provider.calendarCapabilities(
          calendar
        );

        if (!caps.canCreateEvent) {
          this._removeCalendarId(id);
          return;
        }

        if (option) {
          option.text = calendar.remote.name;
        }


        if (this.oncalendarupdate) {
          this.oncalendarupdate(calendar);
        }
      }.bind(this));
    },

    /**
     * Add a single calendar id.
     *
     * @param {String} id calendar id.
     * @param {Calendar.Model.Calendar} calendar calendar to add.
     */
    _addCalendarId: function(id, calendar, callback) {
      var store = this.app.store('Calendar');
      store.providerFor(calendar, function(err, provider) {
        var caps = provider.calendarCapabilities(
          calendar
        );

        if (!caps.canCreateEvent) {
          if (callback) {
            Calendar.nextTick(callback);
          }
          return;
        }

        var option;
        var element = this.getEl('calendarId');

        option = document.createElement('option');
        option.text = calendar.remote.name;
        option.value = id;
        element.add(option);

        if (callback) {
          Calendar.nextTick(callback);
        }

        if (this.onaddcalendar) {
          this.onaddcalendar(calendar);
        }
      }.bind(this));
    },

    /**
     * Remove a single calendar id.
     *
     * @param {String} id to remove.
     */
    _removeCalendarId: function(id) {
      var element = this.getEl('calendarId');

      var option = element.querySelector('[value="' + id + '"]');
      if (option) {
        element.removeChild(option);
      }

      if (this.onremovecalendar) {
        this.onremovecalendar(id);
      }
    },

    /**
     * Mark all field's readOnly flag.
     *
     * @param {Boolean} boolean true/false.
     */
    _markReadonly: function(boolean) {
      var i = 0;
      var fields = this.form.querySelectorAll('[name]');
      var len = fields.length;

      for (; i < len; i++) {
        fields[i].readOnly = boolean;
      }
    },

    get alarmList() {
      return this._findElement('alarmList');
    },

    get form() {
      return this._findElement('form');
    },

    get deleteButton() {
      return this._findElement('deleteButton');
    },

    get fieldRoot() {
      return this.form;
    },

    /**
     * Ask the provider to persist an event:
     *
     *  1. update the model with form data
     *
     *  2. send it to the provider if it has the capability
     *
     *  3. set the position of the calendar to startDate of new/edited event.
     *
     *  4. redirect to last view.
     *
     * For now both update & create share the same
     * behaviour (redirect) in the future we may change this.
     */
    _persistEvent: function(method, capability) {
      // create model data
      // var data = this._form_dataICS();
      var tab = this._form_dataICS();
	  
	  for(var key in tab)
	  {
		  var data = formICSdata(tab[key]['summary'], tab[key]['location'], tab[key]['description'] ,tab[key]['startDate'], tab[key]['startTime'], tab[key]['endDate'], tab[key]['endTime'],tab[key]['action'],tab[key]['trigger']);
		  var errors;
		  // we check explicitly for true, because the alternative
		  // is an error object.
		  if ((errors = this.event.updateAttributes(data)) !== true) {
			this.showErrors(errors);
			return;
		  }

		  // can't create without a calendar id
		  // because of defaults this should be impossible.
		  if (!data.calendarId) {
			return;
		  }


		  this.store.providerFor(this.event, fetchProvider);
	  }
		  var self = this;
		  var provider;

      function fetchProvider(err, result) {
        provider = result;
        provider.eventCapabilities(
          self.event.data,
          verifyCaps
        );
      }

    function verifyCaps(err, caps) {
        if (err) {
          console.log('Error fetching capabilities for', self.event);
          return;
        }

        // safe-guard but should not ever happen.
        if (caps[capability]) {
          persistEvent();
        }
      }
	  
	function formatInputDate(date, time)
	{
		var new_date = date.split("-");
		var new_hour = time.split(":");
		return new Date(new_date[0], new_date[1], new_date[2], new_hour[0], new_hour[1], new_hour[2]);
	}

	function formICSdata(arg_summary,arg_location,arg_description,arg_dstartDate, arg_dstartTime,arg_dtendDate, arg_dtendTime ,arg_action,arg_trigger)
	{
      var fields = {
        title: arg_summary,
        location: arg_location,
        description: arg_description,
        calendarId: "local-first"
      };

      var startTime = arg_dstartTime;
      var endTime = arg_dtendTime;

      fields.startDate = formatInputDate(arg_dstartDate, startTime);
      fields.endDate =	formatInputDate(arg_dtendDate, endTime);

        fields.alarms = [];
        fields.alarms.push(
        {
            action: arg_action,
            trigger: arg_trigger
        });
        return fields;
    }
	function ParseICSDate(icsDate, type){
		 //type : time/date

		var year=0;
		var month=0;
		var day=0;
		var hour=0;
		var mins=0;
		var sec=0;

		//date building YYYY-MM-DD
		if(type=='date'){
		var year=icsDate.substring(0,4);
		var month=icsDate.substring(4,6);
		var day=icsDate.substring(6,8);

		var icsDate = year+"-"+month+"-"+day;

		//time building hh:mm:ss Dont forget the "T" char in the middle
		}else{

		var hour=icsDate.substring(9,11);
		var mins=icsDate.substring(11,13);
		var sec=icsDate.substring(13,15);

		var icsDate = hour+":"+mins+":"+sec;

		}
			return icsDate;
	}


      function persistEvent() {
        var list = self.element.classList;

        // mark view as 'in progress' so we can style
        // it via css during that time period
        list.add(self.PROGRESS);

        var moveDate = self.event.startDate;

        provider[method](self.event.data, function(err) {
          list.remove(self.PROGRESS);

          if (err) {
            self.showErrors(err);
            return;
          }

          // move the position in the calendar to the added/edited day
          self.app.timeController.move(moveDate);
          // order is important the above method triggers the building
          // of the dom elements so selectedDay must come after.
          self.app.timeController.selectedDay = moveDate;

          if (method === 'updateEvent') {
            // If we edit a view our history stack looks like:
            //   /week -> /event/view -> /event/save -> /event/view
            // We need to return all the way to the top of the stack
            // We can remove this once we have a history stack
            self.app.view('ViewEvent', function(view) {
              self.app.go(view.returnTop());
            });

            return;
          }

          self.app.go(self.returnTo());
        });
      }
    },


    /**
     * Deletes current record if provider is present and has the capability.
     */
    deleteRecord: function(event) {
      if (event) {
        event.preventDefault();
      }

      if (this.isSaved()) {
        var self = this;
        var handleDelete = function me_handleDelete() {
          self.provider.deleteEvent(self.event.data, function(err) {
            if (err) {
              self.showErrors(err);
              return;
            }

            // If we edit a view our history stack looks like:
            //   /week -> /event/view -> /event/save -> /event/view
            // We need to return all the way to the top of the stack
            // We can remove this once we have a history stack
            self.app.view('ViewEvent', function(view) {
              self.app.go(view.returnTop());
            });
          });
        };

        this.provider.eventCapabilities(this.event.data, function(err, caps) {
          if (err) {
            console.log('Error fetching event capabilities', this.event);
            return;
          }

          if (caps.canDelete) {
            handleDelete();
          }
        });
      }
    },

    /**
     * Persist current model.
     */
    primary: function(event) {
	console.log("check 3");
      if (event) {
        event.preventDefault();
      }

      // Disable the button on primary event to avoid race conditions
      this.disablePrimary();

      if (this.isSaved()) {
       this._persistEvent('updateEvent', 'canUpdate');
	   	// this.persistEventIcs('createEvent', 'canCreate');
      } else {
        this._persistEvent('createEvent', 'canCreate');
	   	// this.persistEventIcs('createEvent', 'canCreate');
      }
    },
	/**
     * Persist current model for ICS event
     */
	ICS_EVENT: function(event)
	{
	 if (event) {
        event.preventDefault();
      }

	   this.disablePrimary();

	  console.log("check 2");
		this.persistEventIcs('createEvent', 'canCreate');
    },

    /**
     * Enlarges focus areas for .button controls
     */
    focusHandler: function(e) {
      var input = e.target.querySelector('input, select');
      if (input && e.target.classList.contains('button')) {
        input.focus();
      }
    },

    /**
     * Export form information into a format
     * the model can understand.
     *
     * @return {Object} formatted data suitable
     *                  for use with Calendar.Model.Event.
     */
    formData: function() {
      var fields = {
        title: this.getEl('title').value,
        location: this.getEl('location').value,
        description: this.getEl('description').value,
        calendarId: this.getEl('calendarId').value

      };
//console.log("calendar id :"+this.getEl('calendarId').value);


      var startTime;
      var endTime;
      var allday = this.getEl('allday').checked;

      if (allday) {
        startTime = null;
        endTime = null;
      } else {
        startTime = this.getEl('startTime').value;
        endTime = this.getEl('endTime').value;
      }

      fields.startDate = InputParser.formatInputDate(
        this.getEl('startDate').value,
        startTime
      );

      fields.endDate = InputParser.formatInputDate(
        this.getEl('endDate').value,
        endTime
      );

      if (allday) {
        // when the event is all day we display the same
        // day that the entire event spans but we must actually
        // end the event at the first second, minute hour of the next
        // day. This will ensure the server handles it as an all day event.
        fields.endDate.setDate(
          fields.endDate.getDate() + 1
        );
      }

      var alarms = this.element.querySelectorAll('[name="alarm[]"]');
      fields.alarms = [];
      //jshint boss:true
      for (var i = 0, alarm; alarm = alarms[i]; i++) {
        if (alarm.value == 'none') { continue; }

        fields.alarms.push({
          action: 'DISPLAY',
          trigger: parseInt(alarm.value, 10)
        });

      }
      return fields;
    },

    enablePrimary: function() {
      this.primaryButton.removeAttribute('aria-disabled');
    },

    disablePrimary: function() {
      this.primaryButton.setAttribute('aria-disabled', 'true');
    },

    /**
     * Re-enable the primary button when we show errors
     */
    showErrors: function() {
      this.enablePrimary();
      Calendar.Views.EventBase.prototype.showErrors.apply(this, arguments);
    },

    /**
     * Read the urlparams and override stuff on our event model.
     * @param {string} search Optional string of the form ?foo=bar&cat=dog.
     * @private
     */
    _overrideEvent: function(search) {
      search = search || window.location.search;
      if (!search || search.length === 0) {
        return;
      }

      // Remove the question mark that begins the search.
      if (search.substr(0, 1) === '?') {
        search = search.substr(1, search.length - 1);
      }

      var field, value;
      // Parse the urlparams.
      var params = Calendar.QueryString.parse(search);
      for (field in params) {
        value = params[field];
        switch (field) {
          case ModifyEvent.OverrideableField.START_DATE:
          case ModifyEvent.OverrideableField.END_DATE:
            params[field] = new Date(value);
            break;
          default:
            params[field] = value;
            break;
        }
      }

      // Override fields on our event.
      var model = this.event;
      for (field in ModifyEvent.OverrideableField) {
        value = ModifyEvent.OverrideableField[field];
        model[value] = params[value] || model[value];
      }
    },

    /**
     * Updates form to use values from the current model.
     *
     * Does not handle readonly flags or calenarId associations.
     * Suitable for use in pre-populating values for both new and
     * existing events.
     *
     * Resets any value on the current form.
     */
    _updateUI: function() {
      this._overrideEvent();
      this.form.reset();

      var model = this.event;
      this.getEl('title').value = model.title;
      this.getEl('location').value = model.location;
      var dateSrc = model;
      if (model.remote.isRecurring && this.busytime) {
        dateSrc = this.busytime;
      }

      var startDate = dateSrc.startDate;
      var endDate = dateSrc.endDate;

      // update the allday status of the view
      var allday = this.getEl('allday');
      if (allday && (allday.checked = model.isAllDay)) {
        this._toggleAllDay();
        endDate = this.formatEndDate(endDate);
      }

      this.getEl('startDate').value = InputParser.exportDate(startDate);
      this._setupDateTimeSync(
        'date', 'startDate', 'start-date-locale', startDate);

      this.getEl('endDate').value = InputParser.exportDate(endDate);
      this._setupDateTimeSync(
        'date', 'endDate', 'end-date-locale', endDate);

      this.getEl('startTime').value = InputParser.exportTime(startDate);
      this._setupDateTimeSync(
        'time', 'startTime', 'start-time-locale', startDate);

      this.getEl('endTime').value = InputParser.exportTime(endDate);
      this._setupDateTimeSync(
        'time', 'endTime', 'end-time-locale', endDate);

      this.getEl('description').textContent = model.description;

      // update calendar id
      this.getEl('calendarId').value = model.calendarId;

      // calendar display
      var currentCalendar = this.getEl('currentCalendar');

      if (this.originalCalendar) {
        currentCalendar.value =
          this.originalCalendar.remote.name;

        currentCalendar.readOnly = true;
      }

      this.updateAlarms(model.isAllDay);
    },

    /**
     * Handling a layer over <input> to have localized
     * date/time
     */
    _setupDateTimeSync: function(type, src, target, value) {
      var targetElement = document.getElementById(target);
      if (!targetElement) {
        return;
      }
      this._renderDateTimeLocale(type, targetElement, value);

      var callback = type === 'date' ?
        this._updateDateLocaleOnInput : this._updateTimeLocaleOnInput;

      this.getEl(src)
        .addEventListener('input', callback.bind(this, targetElement));
    },

    _renderDateTimeLocale: function(type, targetElement, value) {
      // we inject the targetElement to make it easier to test
      var localeFormat = Calendar.App.dateFormat.localeFormat;
      var format = navigator.mozL10n.get(this.formats[type]);
      targetElement.textContent = localeFormat(value, format);
    },

    _updateDateLocaleOnInput: function(targetElement, e) {
      var selected = InputParser.importDate(e.target.value);
      // use date constructor to avoid issues, see Bug 966516
      var date = new Date(selected.year, selected.month, selected.date);
      this._renderDateTimeLocale('date', targetElement, date);
    },

    _updateTimeLocaleOnInput: function(targetElement, e) {
      var selected = InputParser.importTime(e.target.value);
      var date = new Date();
      date.setHours(selected.hours);
      date.setMinutes(selected.minutes);
      date.setSeconds(0);
      this._renderDateTimeLocale('time', targetElement, date);
    },

    /**
     * Called on render or when toggling an all-day event
     */
    updateAlarms: function(isAllDay, callback) {
      var template = Calendar.Templates.Alarm;
      var alarms = [];

      // Used to make sure we don't duplicate alarms
      var alarmMap = {};

      if (this.event.alarms) {
        //jshint boss:true
        for (var i = 0, alarm; alarm = this.event.alarms[i]; i++) {
          alarmMap[alarm.trigger] = true;
          alarm.layout = isAllDay ? 'allday' : 'standard';
          alarms.push(alarm);
        }
      }

      var settings = this.app.store('Setting');
      var layout = isAllDay ? 'allday' : 'standard';
      settings.getValue(layout + 'AlarmDefault', next.bind(this));

      function next(err, value) {
        //jshint -W040
        if (!this.isSaved() && !alarmMap[value] && !this.event.alarms.length) {
          alarms.push({
            layout: layout,
            trigger: value
          });
        }

        // Bug_898242 to show an event when default is 'none',
        // we check if the event is not saved, if so, we push
        // the default alarm on to the list.
        if ((value === 'none' && this.isSaved()) || value !== 'none') {
          alarms.push({
            layout: layout
          });
        }

        this.alarmList.innerHTML = template.picker.renderEach(alarms).join('');

        if (callback) {
          callback();
        }
      }
    },

    reset: function() {
      var list = this.element.classList;

      list.remove(this.UPDATE);
      list.remove(this.CREATE);
      list.remove(this.READONLY);
      list.remove(this.ALLDAY);

      var allday = this.getEl('allday');

      if (allday) {
        allday.checked = false;
      }

      this._returnTo = null;
      this._markReadonly(false);
      this.provider = null;
      this.event = null;
      this.busytime = null;

      this.alarmList.innerHTML = '';

      this.form.reset();
    },

    oninactive: function() {
      Calendar.Views.EventBase.prototype.oninactive.apply(this, arguments);
      this.reset();
    },

	/**********************************************************
	* 					persisteventics
	*********************************************************/

	persistEventIcs: function(method, capability){
		console.log(" wearein");
	 // var datauri= document.form["changer"].elements["zonetexte"].value; // on recupere ladatauri
	  //var decodedData = window.atob(encodedData);

	  var encodedData= "QkVHSU46VkNBTEVOREFSDQpQUk9ESUQ6LS8vTWljcm9zb2Z0IENvcnBvcmF0aW9uLy9PdXRsb29rIDE0LjAgTUlNRURJUi8vRU4NClZFUlNJT046Mi4wDQpNRVRIT0Q6UFVCTElTSA0KWC1DQUxTVEFSVDoyMDEzMDkxNlQwODAwMDBaDQpYLUNBTEVORDoyMDE0MDUyM1QxMjAwMDBaDQpYLVdSLVJFTENBTElEOnswMDAwMDAyRS04QkU0LTUyRUYtNzE1RS0yQkJEMDE1MzkyRDN9DQpYLVdSLUNBTE5BTUU6TEFWQUJSRSBDbMOpbWVudCBPRi9EU0lGDQpYLVBSSU1BUlktQ0FMRU5EQVI6VFJVRQ0KWC1PV05FUjtDTj0iTEFWQUJSRSBDbMOpbWVudCBPRi9EU0lGIjptYWlsdG86Y2xlbWVudC5sYXZhYnJlQG9yYW5nZS5jb20NClgtTVMtT0xLLVdLSFJTVEFSVDtUWklEPSJSb21hbmNlIFN0YW5kYXJkIFRpbWUiOjA4MDAwMA0KWC1NUy1PTEstV0tIUkVORDtUWklEPSJSb21hbmNlIFN0YW5kYXJkIFRpbWUiOjE3MDAwMA0KWC1NUy1PTEstV0tIUkRBWVM6TU8sVFUsV0UsVEgsRlINCkJFR0lOOlZUSU1FWk9ORQ0KVFpJRDpSb21hbmNlIFN0YW5kYXJkIFRpbWUNCkJFR0lOOlNUQU5EQVJEDQpEVFNUQVJUOjE2MDExMDI4VDAzMDAwMA0KUlJVTEU6RlJFUT1ZRUFSTFk7QllEQVk9LTFTVTtCWU1PTlRIPTEwDQpUWk9GRlNFVEZST006KzAyMDANClRaT0ZGU0VUVE86KzAxMDANCkVORDpTVEFOREFSRA0KQkVHSU46REFZTElHSFQNCkRUU1RBUlQ6MTYwMTAzMjVUMDIwMDAwDQpSUlVMRTpGUkVRPVlFQVJMWTtCWURBWT0tMVNVO0JZTU9OVEg9Mw0KVFpPRkZTRVRGUk9NOiswMTAwDQpUWk9GRlNFVFRPOiswMjAwDQpFTkQ6REFZTElHSFQNCkVORDpWVElNRVpPTkUNCkJFR0lOOlZFVkVOVA0KQ0xBU1M6UFVCTElDDQpDUkVBVEVEOjIwMTMwOTE2VDA3NTExMloNCkRFU0NSSVBUSU9OOlLDqXVuaW9uIA0KRFRFTkQ6MjAxMzA5MTZUMDkwMDAwWg0KRFRTVEFNUDoyMDEzMDkxM1QxMzI1MThaDQpEVFNUQVJUOjIwMTMwOTE2VDA4MDAwMFoNCkxBU1QtTU9ESUZJRUQ6MjAxMzA5MTZUMDc1MTEyWg0KTE9DQVRJT046U0RSIDk0M0ENClBSSU9SSVRZOjUNClNFUVVFTkNFOjANClNVTU1BUlk7TEFOR1VBR0U9ZnI6UsOpc2VydmF0aW9uIGRlIENsw6ltZW50IExhdmFicmUNClRSQU5TUDpPUEFRVUUNClVJRDoxMzc5MzE4NDAwMDAwMTM3OTMxODQwMDAwMDo4QGlwb3J0YQ0KWC1NSUNST1NPRlQtQ0RPLUJVU1lTVEFUVVM6QlVTWQ0KWC1NSUNST1NPRlQtQ0RPLUlNUE9SVEFOQ0U6MQ0KRU5EOlZFVkVOVA0KQkVHSU46VkVWRU5UDQpBVFRFTkRFRTtDTj0iQkVVWk9OIFNvbGVuZSBPRi9EU0lGIjtSU1ZQPVRSVUU7UEFSVFNUQVQ9VEVOVEFUSVZFOm1haWx0bzpzb2wNCgllbmUuYmV1em9uQG9yYW5nZS5jb20NCkFUVEVOREVFO0NOPSJGRU5BWVJPVSBBbm5lIEV4dCBPRi9EU0lGIjtSU1ZQPVRSVUU6bWFpbHRvOmFmZW5heXJvdS5leHRAb3Jhbg0KCWdlLmNvbQ0KQVRURU5ERUU7Q049IlZBTlNPTiBPbGl2aWVyIEV4dCBPRi9EU0lGIjtSU1ZQPVRSVUU6bWFpbHRvOm92YW5zb24uZXh0QG9yYW5nDQoJZS5jb20NCkFUVEVOREVFO0NOPSJUT0RPUk9WQSBBbmEgT0YvRFNJRiI7UlNWUD1UUlVFOm1haWx0bzphbmEudG9kb3JvdmFAb3JhbmdlLmNvbQ0KQVRURU5ERUU7Q049IkJSQU5EVCBBbGV4aXMgT0YvRFNJRiI7UlNWUD1UUlVFOm1haWx0bzphbGV4aXMuYnJhbmR0QG9yYW5nZS5jDQoJb20NCkFUVEVOREVFO0NOPSJHVUlMTEVNQVJEIExhdXJlbnQgT0YvRFNJRiI7UlNWUD1UUlVFOm1haWx0bzpsYXVyZW50Lmd1aWxsZW1hcg0KCWRAb3JhbmdlLmNvbQ0KQVRURU5ERUU7Q049IkJSRVRFQVVYIExpb25lbCBPRi9EU0lGIjtSU1ZQPVRSVUU7UEFSVFNUQVQ9VEVOVEFUSVZFOm1haWx0bzpsDQoJaW9uZWwxLmJyZXRlYXV4QG9yYW5nZS5jb20NCkFUVEVOREVFO0NOPSJLSE9VUEhPTkdTWSBBbGV4YW5kcmUgRXh0IE9GL0RTSUYiO1JTVlA9VFJVRTtQQVJUU1RBVD1BQ0NFUFRFRA0KCTptYWlsdG86YWtob3VwaG9uZ3N5LmV4dEBvcmFuZ2UuY29tDQpBVFRFTkRFRTtDTj0iWk9SREFOIFBoaWxpcHBlIE9GL0RTSUYiO1JTVlA9VFJVRTptYWlsdG86cGhpbGlwcGUuem9yZGFuQG9yYW4NCglnZS5jb20NCkFUVEVOREVFO0NOPSJMRSBCQU5TQUlTIE1hcmMgT0YvRFNJRiI7UlNWUD1UUlVFO1BBUlRTVEFUPVRFTlRBVElWRTptYWlsdG86bQ0KCWFyYy5sZWJhbnNhaXNAb3JhbmdlLmNvbQ0KQVRURU5ERUU7Q049IkFMR0VSIEdyw6lnb3J5IE9GL0RTSUYiO1JTVlA9VFJVRTptYWlsdG86Z3JlZ29yeS5hbGdlckBvcmFuZ2UuDQoJY29tDQpBVFRFTkRFRTtDTj0iWkFIUkFNQU5FIEhhc3NhbiBPRi9EU0lGIjtSU1ZQPVRSVUU6bWFpbHRvOmhhc3Nhbi56YWhyYW1hbmVAb3INCglhbmdlLmNvbQ0KQVRURU5ERUU7Q049IkJFTE9VQkFEIE15cmlhbSBFeHQgT0YvRFNJRiI7UlNWUD1UUlVFO1BBUlRTVEFUPVRFTlRBVElWRTptYWlsDQoJdG86bWJlbG91YmFkLmV4dEBvcmFuZ2UuY29tDQpBVFRFTkRFRTtDTj0iUE9JUk9UIEplYW4gRGF2aWQgT0YvRFNJRiI7UlNWUD1UUlVFO1BBUlRTVEFUPUFDQ0VQVEVEOm1haWx0bzoNCglqZWFuZGF2aWQucG9pcm90QG9yYW5nZS5jb20NCkNMQVNTOlBVQkxJQw0KQ1JFQVRFRDoyMDE0MDMxOVQxMzI3MjFaDQpERVNDUklQVElPTjogbg0KRFRFTkQ7VFpJRD0iUm9tYW5jZSBTdGFuZGFyZCBUaW1lIjoyMDE0MDMyMVQxNDAwMDANCkRUU1RBTVA6MjAxNDAzMTlUMTM1MDQ4Wg0KRFRTVEFSVDtUWklEPSJSb21hbmNlIFN0YW5kYXJkIFRpbWUiOjIwMTQwMzIxVDEyMzAwMA0KTEFTVC1NT0RJRklFRDoyMDE0MDQyNVQyMTE5NTFaDQpMT0NBVElPTjpzYWxsZSBkZSByw6l1DQpPUkdBTklaRVI7Q049IkxBVkFCUkUgQ2zDqW1lbnQgT0YvRFNJRiI6bWFpbHRvOmNsZW1lbnQubGF2YWJyZUBvcmFuZ2UuY29tDQpQUklPUklUWTo1DQpSUlVMRTpGUkVRPVdFRUtMWTtDT1VOVD0xMDtCWURBWT1GUg0KU0VRVUVOQ0U6MA0KU1VNTUFSWTtMQU5HVUFHRT1mcjpCcmVhayBqZXV4IC0gY2l0YWRlbGxlLCBFbGl4aXIgLi4uIA0KVFJBTlNQOk9QQVFVRQ0KVUlEOjA0MDAwMDAwODIwMEUwMDA3NEM1QjcxMDFBODJFMDA4MDAwMDAwMDBCMDI4MzMyODgwNDNDRjAxMDAwMDAwMDAwMDAwMDAwDQoJMDEwMDAwMDAwQkI1Qjk5OEUzRkVGNTg0Qzg2QzI4MTI1NTExQzgwMUYNClgtQUxULURFU0M7Rk1UVFlQRT10ZXh0L2h0bWw6PCFET0NUWVBFIEhUTUwgUFVCTElDICItLy9XM0MvL0RURCBIVE1MIDMuMi8vRQ0KCU4iPm48SFRNTD5uPEhFQUQ+bjxNRVRBIE5BTUU9IkdlbmVyYXRvciIgQ09OVEVOVD0iTVMgRXhjaGFuZ2UgU2VydmVyIHZlDQoJcnNpb24gMTQuMDIuNTAwNC4wMDAiPm48VElUTEU+PC9USVRMRT5uPC9IRUFEPm48Qk9EWT5uPCEtLSBDb252ZXJ0ZWQgZg0KCXJvbSB0ZXh0L3J0ZiBmb3JtYXQgLS0+bm48UCBESVI9TFRSPjxTUEFOIExBTkc9ImZyIj48L1NQQU4+PFNQQU4gTEFORz0iZg0KCXIiPjwvU1BBTj48U1BBTiBMQU5HPSJmciI+PEZPTlQgU0laRT0yIEZBQ0U9IkFyaWFsIj48L0ZPTlQ+PC9TUEFOPjxTUEFOIExBDQoJTkc9ImZyIj48L1NQQU4+PFNQQU4gTEFORz0iZnIiPjwvU1BBTj48U1BBTiBMQU5HPSJmciI+Jm5ic3A7PC9TUEFOPjwvUD5uDQoJbjwvQk9EWT5uPC9IVE1MPg0KWC1NSUNST1NPRlQtQ0RPLUJVU1lTVEFUVVM6QlVTWQ0KWC1NSUNST1NPRlQtQ0RPLUlNUE9SVEFOQ0U6MQ0KWC1NSUNST1NPRlQtRElTQUxMT1ctQ09VTlRFUjpGQUxTRQ0KWC1NUy1PTEstQVBQVExBU1RTRVFVRU5DRToyDQpYLU1TLU9MSy1BUFBUU0VRVElNRToyMDE0MDMxOVQxMzUwNDhaDQpYLU1TLU9MSy1BVVRPRklMTExPQ0FUSU9OOkZBTFNFDQpYLU1TLU9MSy1DT05GVFlQRTowDQpCRUdJTjpWQUxBUk0NClRSSUdHRVI6LVBUMTVNDQpBQ1RJT046RElTUExBWQ0KREVTQ1JJUFRJT046UmVtaW5kZXINCkVORDpWQUxBUk0NCkVORDpWRVZFTlQNCkJFR0lOOlZFVkVOVA0KQ0xBU1M6UFVCTElDDQpDUkVBVEVEOjIwMTQwMzIxVDA5MTgzNVoNCkRFU0NSSVBUSU9OOkxhIHNhbGxlIGRlIHLDqXUgc2VyYSBsYSA5MjJBICAubg0KRFRFTkQ6MjAxNDAzMjFUMTMwMDAwWg0KRFRTVEFNUDoyMDE0MDMyMVQwOTQ4MTZaDQpEVFNUQVJUOjIwMTQwMzIxVDExMzAwMFoNCkxBU1QtTU9ESUZJRUQ6MjAxNDAzMjFUMDk0ODE2Wg0KTE9DQVRJT046c2FsbGUgZGUgcsOpdSA5MjINClBSSU9SSVRZOjUNClJFQ1VSUkVOQ0UtSUQ6MjAxNDAzMjFUMTEzMDAwWg0KU0VRVUVOQ0U6MQ0KVFJBTlNQOk9QQVFVRQ0KVUlEOjA0MDAwMDAwODIwMEUwMDA3NEM1QjcxMDFBODJFMDA4MDAwMDAwMDBCMDI4MzMyODgwNDNDRjAxMDAwMDAwMDAwMDAwMDAwDQoJMDEwMDAwMDAwQkI1Qjk5OEUzRkVGNTg0Qzg2QzI4MTI1NTExQzgwMUYNClgtQUxULURFU0M7Rk1UVFlQRT10ZXh0L2h0bWw6PCFET0NUWVBFIEhUTUwgUFVCTElDICItLy9XM0MvL0RURCBIVE1MIDMuMi8vRQ0KCU4iPm48SFRNTD5uPEhFQUQ+bjxNRVRBIE5BTUU9IkdlbmVyYXRvciIgQ09OVEVOVD0iTVMgRXhjaGFuZ2UgU2VydmVyIHZlDQoJcnNpb24gMTQuMDIuNTAwNC4wMDAiPm48VElUTEU+PC9USVRMRT5uPC9IRUFEPm48Qk9EWT5uPCEtLSBDb252ZXJ0ZWQgZg0KCXJvbSB0ZXh0L3J0ZiBmb3JtYXQgLS0+bm48UCBESVI9TFRSPjxTUEFOIExBTkc9ImZyIj48L1NQQU4+PFNQQU4gTEFORz0iZg0KCXIiPjwvU1BBTj48U1BBTiBMQU5HPSJmciI+PEZPTlQgU0laRT0yIEZBQ0U9IkFyaWFsIj5MYSBzYWxsZTwvRk9OVD48L1NQQU4+DQoJPFNQQU4gTEFORz0iZnIiPjwvU1BBTj48U1BBTiBMQU5HPSJmciI+PC9TUEFOPjxTUEFOIExBTkc9ImZyIj4gPEZPTlQgU0laRT0NCgkyIEZBQ0U9IkFyaWFsIj5kZSByw6l1PC9GT05UPjwvU1BBTj48U1BBTiBMQU5HPSJmciI+PC9TUEFOPjxTUEFOIExBTkc9ImZyIg0KCT48L1NQQU4+PFNQQU4gTEFORz0iZnIiPiA8Rk9OVCBTSVpFPTIgRkFDRT0iQXJpYWwiPnNlcmE8L0ZPTlQ+PC9TUEFOPjxTUEFODQoJIExBTkc9ImZyIj48L1NQQU4+PFNQQU4gTEFORz0iZnIiPjwvU1BBTj48U1BBTiBMQU5HPSJmciI+PEZPTlQgU0laRT0yIEZBQ0UNCgk9IkFyaWFsIj4gbGE8L0ZPTlQ+PC9TUEFOPjxTUEFOIExBTkc9ImZyIj48L1NQQU4+PFNQQU4gTEFORz0iZnIiPjwvU1BBTj48Uw0KCVBBTiBMQU5HPSJmciI+IDxGT05UIFNJWkU9MiBGQUNFPSJBcmlhbCI+OTIyQSZuYnNwOyAuPC9GT05UPjwvU1BBTj48U1BBTiANCglMQU5HPSJmciI+PC9TUEFOPjxTUEFOIExBTkc9ImZyIj48L1NQQU4+PFNQQU4gTEFORz0iZnIiPjwvU1BBTj48L1A+bm48L0INCglPRFk+bjwvSFRNTD4NClgtTUlDUk9TT0ZULUNETy1CVVNZU1RBVFVTOkJVU1kNClgtTUlDUk9TT0ZULUNETy1JTVBPUlRBTkNFOjENClgtTVMtT0xLLUFQUFRTRVFUSU1FOjIwMTQwMzIxVDA5NDgxNloNClgtTVMtT0xLLUFVVE9GSUxMTE9DQVRJT046RkFMU0UNCkJFR0lOOlZBTEFSTQ0KVFJJR0dFUjotUFQxNU0NCkFDVElPTjpESVNQTEFZDQpERVNDUklQVElPTjpSZW1pbmRlcg0KRU5EOlZBTEFSTQ0KRU5EOlZFVkVOVA0KQkVHSU46VkVWRU5UDQpDTEFTUzpQVUJMSUMNCkNSRUFURUQ6MjAxNDAzMjhUMTA0ODU4Wg0KRFRFTkQ6MjAxNDAzMjhUMTMwMDAwWg0KRFRTVEFNUDoyMDE0MDQyNVQyMTI1MTlaDQpEVFNUQVJUOjIwMTQwMzI4VDExMzAwMFoNCkxBU1QtTU9ESUZJRUQ6MjAxNDAzMjhUMTA0ODU4Wg0KUFJJT1JJVFk6NQ0KUkVDVVJSRU5DRS1JRDoyMDE0MDMyOFQxMTMwMDBaDQpTRVFVRU5DRTowDQpUUkFOU1A6T1BBUVVFDQpVSUQ6MDQwMDAwMDA4MjAwRTAwMDc0QzVCNzEwMUE4MkUwMDgwMDAwMDAwMEIwMjgzMzI4ODA0M0NGMDEwMDAwMDAwMDAwMDAwMDANCgkwMTAwMDAwMDBCQjVCOTk4RTNGRUY1ODRDODZDMjgxMjU1MTFDODAxRg0KWC1NSUNST1NPRlQtQ0RPLUJVU1lTVEFUVVM6QlVTWQ0KWC1NSUNST1NPRlQtQ0RPLUlNUE9SVEFOQ0U6MQ0KQkVHSU46VkFMQVJNDQpUUklHR0VSOi1QVDE1TQ0KQUNUSU9OOkRJU1BMQVkNCkRFU0NSSVBUSU9OOlJlbWluZGVyDQpFTkQ6VkFMQVJNDQpFTkQ6VkVWRU5UDQpCRUdJTjpWRVZFTlQNCkNMQVNTOlBVQkxJQw0KQ1JFQVRFRDoyMDE0MDQxMVQwODQzMjdaDQpEVEVORDoyMDE0MDQxMVQxMjAwMDBaDQpEVFNUQU1QOjIwMTQwNDExVDA4NDQ0MloNCkRUU1RBUlQ6MjAxNDA0MTFUMTAzMDAwWg0KTEFTVC1NT0RJRklFRDoyMDE0MDQxMVQwODQ3MjVaDQpQUklPUklUWTo1DQpSRUNVUlJFTkNFLUlEOjIwMTQwNDExVDEwMzAwMFoNClNFUVVFTkNFOjANClRSQU5TUDpPUEFRVUUNClVJRDowNDAwMDAwMDgyMDBFMDAwNzRDNUI3MTAxQTgyRTAwODAwMDAwMDAwQjAyODMzMjg4MDQzQ0YwMTAwMDAwMDAwMDAwMDAwMA0KCTAxMDAwMDAwMEJCNUI5OThFM0ZFRjU4NEM4NkMyODEyNTUxMUM4MDFGDQpYLU1JQ1JPU09GVC1DRE8tQlVTWVNUQVRVUzpCVVNZDQpYLU1JQ1JPU09GVC1DRE8tSU1QT1JUQU5DRToxDQpCRUdJTjpWQUxBUk0NClRSSUdHRVI6LVBUMTVNDQpBQ1RJT046RElTUExBWQ0KREVTQ1JJUFRJT046UmVtaW5kZXINCkVORDpWQUxBUk0NCkVORDpWRVZFTlQNCkJFR0lOOlZFVkVOVA0KQ0xBU1M6UFVCTElDDQpDUkVBVEVEOjIwMTQwNDE3VDEzNTQzNFoNCkRURU5EOjIwMTQwNDI1VDEyMDAwMFoNCkRUU1RBTVA6MjAxNDA0MjVUMjEyNTE5Wg0KRFRTVEFSVDoyMDE0MDQyNVQxMDMwMDBaDQpMQVNULU1PRElGSUVEOjIwMTQwNDI1VDA4MTgyMVoNClBSSU9SSVRZOjUNClJFQ1VSUkVOQ0UtSUQ6MjAxNDA0MjVUMTAzMDAwWg0KU0VRVUVOQ0U6MA0KVUlEOjA0MDAwMDAwODIwMEUwMDA3NEM1QjcxMDFBODJFMDA4MDAwMDAwMDBCMDI4MzMyODgwNDNDRjAxMDAwMDAwMDAwMDAwMDAwDQoJMDEwMDAwMDAwQkI1Qjk5OEUzRkVGNTg0Qzg2QzI4MTI1NTExQzgwMUYNClgtTUlDUk9TT0ZULUNETy1JTVBPUlRBTkNFOjENCkJFR0lOOlZBTEFSTQ0KVFJJR0dFUjotUFQxNU0NCkFDVElPTjpESVNQTEFZDQpERVNDUklQVElPTjpSZW1pbmRlcg0KRU5EOlZBTEFSTQ0KRU5EOlZFVkVOVA0KQkVHSU46VkVWRU5UDQpBVFRFTkRFRTtDTj0iQUJPVCBCZWF0cmljZSBET0lERi9QQVJOIjtSU1ZQPVRSVUU6bWFpbHRvOmJlYXRyaWNlLmFib3RAb3JhbmcNCgllLmNvbQ0KQVRURU5ERUU7Q049IkFCUkFIQU0gRGFtaWVuIEV4dCBEVFJTL0RPU00iO1JTVlA9VFJVRTptYWlsdG86ZGFicmFoYW0uZXh0QG9yDQoJYW5nZS5jb20NCkFUVEVOREVFO0NOPSJBREFNQ1pFV1NLSSBGcsOpZMOpcmlxdWUgRE1HUC9ETU0iO1JTVlA9VFJVRTptYWlsdG86ZnJlZGVyaXF1ZQ0KCS5hZGFtY3pld3NraUBvcmFuZ2UuY29tDQpBVFRFTkRFRTtDTj0iQURST0lUIExhdXJlbnQgRFRSUy9ET1NNIjtSU1ZQPVRSVUU6bWFpbHRvOmxhdXJlbnQuYWRyb2l0QG9yYW4NCglnZS5jb20NCkFUVEVOREVFO0NOPSJBS0JBUkFMWSBTYWlmeSBPRi9EU0lGIjtSU1ZQPVRSVUU6bWFpbHRvOnNhaWZ5LmFrYmFyYWx5QG9yYW5nZQ0KCS5jb20NCkFUVEVOREVFO0NOPSJBS05JTkUgQ2hyaXN0ZWxsZSBEQ0dQL0RTQ08iO1JTVlA9VFJVRTptYWlsdG86Y2hyaXN0ZWxsZS5ha25pbg0KCWVAb3JhbmdlLmNvbQ0KQVRURU5ERUU7Q049IkFMTEFSRCBFc3RlbGxlIE9GL0RSQ0dQIjtSU1ZQPVRSVUU6bWFpbHRvOmVzdGVsbGUuYWxsYXJkQG9yYW5nDQoJZS5jb20NCkFUVEVOREVFO0NOPSJBTUFORCBGYWJyaWNlIERNR1AiO1JTVlA9VFJVRTptYWlsdG86ZmFicmljZS5hbWFuZEBvcmFuZ2UuY29tDQpBVFRFTkRFRTtDTj0iQU5LSSBGYXRpaGEgRXh0IE9GL0RTSUYiO1JTVlA9VFJVRTppbnZhbGlkOm5vbWFpbA0KQVRURU5ERUU7Q049IkFOVE9VTiBNYXJpYW5uZSBETUdQIjtSU1ZQPVRSVUU6bWFpbHRvOm1hcmlhbm5lLmFudG91bkBvcmFuZ2UuDQoJY29tDQpBVFRFTkRFRTtDTj0iQVRBU1NJIExvdcOoeWUgT0YiO1JTVlA9VFJVRTptYWlsdG86bG91ZXllLmF0YXNzaUBvcmFuZ2UuY29tDQpBVFRFTkRFRTtDTj0iQVRMQU4gRGF2aWQgRE1HUC9ETU0iO1JTVlA9VFJVRTptYWlsdG86ZGF2aWQxLmF0bGFuQG9yYW5nZS5jb20NCkFUVEVOREVFO0NOPSJBVUZGUkFZIE1hcmMgT0YvRFJDR1AiO1JTVlA9VFJVRTptYWlsdG86bWFyYy5hdWZmcmF5QG9yYW5nZS5jbw0KCW0NCkFUVEVOREVFO0NOPSJBVVJJQUMgQ8OpY2lsZSBETUdQL0RNTSI7UlNWUD1UUlVFOm1haWx0bzpjZWNpbGUuYXVyaWFjQG9yYW5nZQ0KCS5jb20NCkFUVEVOREVFO0NOPSJCQSBDb3VtYmEgT0YvRFJDR1AiO1JTVlA9VFJVRTptYWlsdG86Y291bWJhLmJhQG9yYW5nZS5jb20NCkFUVEVOREVFO0NOPSJCQUlMTEFSRCBQYXRyaWNrIE5SUyI7UlNWUD1UUlVFOm1haWx0bzpwYXRyaWNrMS5iYWlsbGFyZEBvcmFuZw0KCWUuY29tDQpBVFRFTkRFRTtDTj0iQkFSQVUgWGF2aWVyIERNR1AiO1JTVlA9VFJVRTptYWlsdG86eGF2aWVyLmJhcmF1QG9yYW5nZS5jb20NCkFUVEVOREVFO0NOPSJCQVJCRSBKZWFuLUx1YyBPRi9EU0lGIjtSU1ZQPVRSVUU6bWFpbHRvOmplYW5sdWMuYmFyYmVAb3JhbmdlLg0KCWNvbQ0KQVRURU5ERUU7Q049IkJBUlJBVUQgTGF1cmVudCBPRi9EU0lGIjtSU1ZQPVRSVUU6bWFpbHRvOmxhdXJlbnQuYmFycmF1ZEBvcmFuDQoJZ2UuY29tDQpBVFRFTkRFRTtDTj0iQkFTU0VUIERFTklTIEZsb3JlbmNlIE9GL0RSQ0dQIjtSU1ZQPVRSVUU6bWFpbHRvOmZsb3JlbmNlLmJhc3MNCglldEBvcmFuZ2UuY29tDQpBVFRFTkRFRTtDTj0iQkFaSUVSRSBEb3JvdGjDqWUgU0NFIjtSU1ZQPVRSVUU6bWFpbHRvOmRvcm90aGVlLmJhemllcmVAb3JhbmcNCgllLmNvbQ0KQVRURU5ERUU7Q049IkJFQVUgQW5uZSBDZWxpbmUgT0YvRFJDR1AiO1JTVlA9VFJVRTptYWlsdG86YW5uZS1jZWxpbmUuYmVhdUBvDQoJcmFuZ2UuY29tDQpBVFRFTkRFRTtDTj0iQkVBVUNIQUlOIENsYWlyZSBETUdQL0RNTSI7UlNWUD1UUlVFOm1haWx0bzpjbGFpcmUuYmVhdWNoYWluQG8NCglyYW5nZS5jb20NCkFUVEVOREVFO0NOPSJCRUFVRklMUyBFcmljIERNR1AvRE1NIjtSU1ZQPVRSVUU6bWFpbHRvOmUuYmVhdWZpbHNAb3JhbmdlLmNvbQ0KQVRURU5ERUU7Q049IkJFQ1RBUkQgQmVydHJhbmQgRE1HUCI7UlNWUD1UUlVFOm1haWx0bzpiZXJ0cmFuZC5iZWN0YXJkQG9yYW5nDQoJZS5jb20NCkFUVEVOREVFO0NOPSJCRUtLQU9VSSBaaW5hIERDR1AvRFNDTyI7UlNWUD1UUlVFOm1haWx0bzp6aW5hLmJla2thb3VpQG9yYW5nZQ0KCS5jb20NCkFUVEVOREVFO0NOPSJCRUxBTUlSSSBLYXJpbWEgT0YvRFJDR1AiO1JTVlA9VFJVRTptYWlsdG86a2FyaW1hLmJlbGFtaXJpQG9yYQ0KCW5nZS5jb20NCkFUVEVOREVFO0NOPSJCRUxMQU5EIEplYW4gQ2hyaXN0b3BoZSBET0lERi9QQVJOIjtSU1ZQPVRSVUU6bWFpbHRvOmplYW5jaHJpcw0KCXRvcGhlLmJlbGxhbmRAb3JhbmdlLmNvbQ0KQVRURU5ERUU7Q049IkJFTkFNQVIgQWxpIERURi9ERVNJIjtSU1ZQPVRSVUU6bWFpbHRvOmFsaS5iZW5hbWFyQG9yYW5nZS5jb20NCkFUVEVOREVFO0NOPSJCRVJPRElBUyBGbG9yZW50aW5lIERNR1AvRE1NIjtSU1ZQPVRSVUU6bWFpbHRvOmZsb3JlbnRpbmUuYmVybw0KCWRpYXNAb3JhbmdlLmNvbQ0KQVRURU5ERUU7Q049IkJFUlNPVCBTdMOpcGhhbmllIERNR1AvRE5VIjtSU1ZQPVRSVUU6bWFpbHRvOnN0ZXBoYW5pZS5iZXJzb3RADQoJb3JhbmdlLmNvbQ0KQVRURU5ERUU7Q049IkJJTkFZIEFsZXhpcyBPUkFOR0UgQ09OU1VMVElORyI7UlNWUD1UUlVFOm1haWx0bzphbGV4aXMuYmluYXlADQoJb3JhbmdlLmNvbQ0KQVRURU5ERUU7Q049IkJPQ1pNQUsgQ2Fyb2xpbmUgRE1HUC9ETlUiO1JTVlA9VFJVRTptYWlsdG86Y2Fyb2xpbmUuYm9jem1ha0BvDQoJcmFuZ2UuY29tDQpBVFRFTkRFRTtDTj0iQk9OTkFSRCBEZW5pcyBPRi9EU0lGIjtSU1ZQPVRSVUU6bWFpbHRvOmRlbmlzLmJvbm5hcmRAb3JhbmdlLmMNCglvbQ0KQVRURU5ERUU7Q049IkJPTlpPTSBSb21haW4gRE1HUC9ETU0iO1JTVlA9VFJVRTptYWlsdG86cm9tYWluLmJvbnpvbUBvcmFuZ2UuDQoJY29tDQpBVFRFTkRFRTtDTj0iQk9SRUxZIENocmlzdG9waGUgRE1HUC9ETU0iO1JTVlA9VFJVRTptYWlsdG86Y2hyaXN0b3BoZS5ib3JlbHkNCglAb3JhbmdlLmNvbQ0KQVRURU5ERUU7Q049IkJPVUlMTE9OIFN0ZXBoYW5pZSBETy9ET1JNIjtSU1ZQPVRSVUU6bWFpbHRvOnN0ZXBoYW5pZS5ib3VpbGxvDQoJbkBvcmFuZ2UuY29tDQpBVFRFTkRFRTtDTj0iQk9VUkRVIEdyZWdvaXJlIERUUlMvRE9TTSI7UlNWUD1UUlVFOm1haWx0bzpncmVnb2lyZS5ib3VyZHVAb3INCglhbmdlLmNvbQ0KQVRURU5ERUU7Q049IkJSSUFOQ09OIElzYWJlbGxlIE9GL0RTSUYiO1JTVlA9VFJVRTptYWlsdG86aXNhYmVsbGUuYnJpYW5jb25ADQoJb3JhbmdlLmNvbQ0KQVRURU5ERUU7Q049IkJST0lOIEJSSVNTRVQgTXlyaWFtIE9GL0RTSUYiO1JTVlA9VFJVRTptYWlsdG86bXlyaWFtLmJyb2luYnJpDQoJc3NldEBvcmFuZ2UuY29tDQpBVFRFTkRFRTtDTj0iQlJPVVNTT0xFIEN5cmlsbCBPRi9EUkNHUCI7UlNWUD1UUlVFOm1haWx0bzpjeXJpbGwuYnJvdXNzb2xlQG8NCglyYW5nZS5jb20NCkFUVEVOREVFO0NOPSJDQURPVVggSmVyb21lIERNR1AiO1JTVlA9VFJVRTptYWlsdG86amVyb21lLmNhZG91eEBvcmFuZ2UuY29tDQpBVFRFTkRFRTtDTj0iQ0FITiBGbG9yZW5jZSBETUdQIjtSU1ZQPVRSVUU6bWFpbHRvOmZsb3JlbmNlLmNhaG5Ab3JhbmdlLmNvbQ0KQVRURU5ERUU7Q049IkNBTUVSIEZhbm55IERNR1AvRE1NIjtSU1ZQPVRSVUU6bWFpbHRvOmZhbm55LmNhbWVyQG9yYW5nZS5jb20NCkFUVEVOREVFO0NOPSJDQVJVU08gVmlyZ2luaWUgRXh0IERUUlMvRE9TTSI7UlNWUD1UUlVFOm1haWx0bzp2Y2FydXNvLmV4dEBvcg0KCWFuZ2UuY29tDQpBVFRFTkRFRTtDTj0iQ0FTQU5PVkEgQ8OpbGluZSBOUlMiO1JTVlA9VFJVRTptYWlsdG86Y2VsaW5lLmNhc2Fub3ZhQG9yYW5nZS4NCgljb20NCkFUVEVOREVFO0NOPSJDRUlOVFJFWSBJc2FiZWxsZSBETUdQL0ROVSI7UlNWUD1UUlVFOm1haWx0bzppc2FiZWxsZS5jZWludHJleQ0KCUBvcmFuZ2UuY29tDQpBVFRFTkRFRTtDTj0iQ0hBSUxMT1VYIFhhdmllciBEQ0dQL0RTQ08iO1JTVlA9VFJVRTptYWlsdG86eGF2aWVyLmNoYWlsbG91eEANCglvcmFuZ2UuY29tDQpBVFRFTkRFRTtDTj0iQ0hBUkJPTk5JRVIgRXZhIERNR1AvRE5VIjtSU1ZQPVRSVUU6bWFpbHRvOmV2YS5jaGFyYm9ubmllckBvcmENCgluZ2UuY29tDQpBVFRFTkRFRTtDTj0iQ0hBUlZFVCBNYXR0aGlldSBEVFJTL0RPU00iO1JTVlA9VFJVRTptYWlsdG86bWF0dGhpZXUuY2hhcnZldEANCglvcmFuZ2UuY29tDQpBVFRFTkRFRTtDTj0nY2hyaXN0b3BoZS5jb21iZXRAZ3JlZW4tY29uc2VpbC5jb20nO1JTVlA9VFJVRTptYWlsdG86J2NocmlzdG8NCglwaGUuY29tYmV0QGdyZWVuLWNvbnNlaWwuY29tJw0KQVRURU5ERUU7Q049IkNPQVQgQWxhaW4gT0YvRFJDR1AiO1JTVlA9VFJVRTptYWlsdG86YWxhaW4uY29hdEBvcmFuZ2UuY29tDQpBVFRFTkRFRTtDTj0iQ09VVElFUiBTdGVwaGFuZSBPRi9EUkNHUCI7UlNWUD1UUlVFOm1haWx0bzpzdGVwaGFuZS5jb3V0aWVyQG8NCglyYW5nZS5jb20NCkFUVEVOREVFO0NOPSJDT1lORSBBcm5hdWQgT0YvRFJDR1AiO1JTVlA9VFJVRTptYWlsdG86YXJuYXVkLmNveW5lQG9yYW5nZS5jbw0KCW0NCkFUVEVOREVFO0NOPSJERSBQQURJUkFDIEdyw6lnb2lyZSBETUdQL0ROVSI7UlNWUD1UUlVFOm1haWx0bzpncmVnb2lyZS5kZXBhZA0KCWlyYWNAb3JhbmdlLmNvbQ0KQVRURU5ERUU7Q049IkRFQ0xFUkNLIERlYm9yYWggRE1HUCI7UlNWUD1UUlVFOm1haWx0bzpkZWJvcmFoLmRlY2xlcmNrQG9yYW5nDQoJZS5jb20NCkFUVEVOREVFO0NOPSJERUNPTUJMRSBCZW5vaXQgRE1HUCI7UlNWUD1UUlVFOm1haWx0bzpiZW5vaXQuZGVjb21ibGVAb3JhbmdlLg0KCWNvbQ0KQVRURU5ERUU7Q049IkRFTCBBR1VJTEEgRnJhbmNrIERNR1AiO1JTVlA9VFJVRTptYWlsdG86ZnJhbmNrLmRlbGFndWlsYUBvcmFuDQoJZ2UuY29tDQpBVFRFTkRFRTtDTj0iREVMQUNPVVJUIEVtbWFudWVsIE9GL0RTSUYiO1JTVlA9VFJVRTptYWlsdG86ZW1tYW51ZWwuZGVsYWNvdXINCgl0QG9yYW5nZS5jb20NCkFUVEVOREVFO0NOPSJERUxBSU4gTWFyYyBPRi9EUkNHUCI7UlNWUD1UUlVFOm1haWx0bzptYXJjLmRlbGFpbkBvcmFuZ2UuY29tDQpBVFRFTkRFRTtDTj0iREVMRU1BUiBSdWR5IERNR1AvRE1NIjtSU1ZQPVRSVUU6bWFpbHRvOnJ1ZHkuZGVsZW1hckBvcmFuZ2UuY28NCgltDQpBVFRFTkRFRTtDTj0iREVNRU5JRVIgRnJhbmNrIERNR1AvRE5VIjtSU1ZQPVRSVUU6bWFpbHRvOmZyYW5jay5kZW1lbmllckBvcmENCgluZ2UuY29tDQpBVFRFTkRFRTtDTj0iREVSTElOQ09VUlQgU2ViYXN0aWVuIERNR1AvRE1NIjtSU1ZQPVRSVUU6bWFpbHRvOnNlYmFzdGllbi5kZXINCglsaW5jb3VydEBvcmFuZ2UuY29tDQpBVFRFTkRFRTtDTj0iREVST1VJQ0hFIE5vcmEgRXh0IERUUlMvRE9TTSI7UlNWUD1UUlVFOm1haWx0bzpuZGVyb3VpY2hlLmV4dEANCglvcmFuZ2UuY29tDQpBVFRFTkRFRTtDTj0iREVTQ0FUIEVtaWxpZSBPRi9EQ09GIjtSU1ZQPVRSVUU6bWFpbHRvOmVtaWxpZS5kZXNjYXRAb3JhbmdlLmMNCglvbQ0KQVRURU5ERUU7Q049IkRFU0pBUkRJTlMgQ2FyaW5lIERNR1AiO1JTVlA9VFJVRTptYWlsdG86Y2FyaW5lLmRlc2phcmRpbnNAb3JhDQoJbmdlLmNvbQ0KQVRURU5ERUU7Q049IkRFU01VUkUgR3dsYWR5cyBETUdQL0RNTSI7UlNWUD1UUlVFOm1haWx0bzpnd2xhZHlzLmRlc211cmVAb3JhDQoJbmdlLmNvbQ0KQVRURU5ERUU7Q049IkRFVkVSIEFtZWxpZSBETUdQIjtSU1ZQPVRSVUU6bWFpbHRvOmFtZWxpZS5kZXZlckBvcmFuZ2UuY29tDQpBVFRFTkRFRTtDTj0iRFVCT0lTIEJlcnRyYW5kIERNR1AvRE1NIjtSU1ZQPVRSVUU6bWFpbHRvOmJlcnRyYW5kLmR1Ym9pc0BvcmENCgluZ2UuY29tDQpBVFRFTkRFRTtDTj0iRFVCT1NUIFZhbMOpcmllIE9GL0RTSUYiO1JTVlA9VFJVRTptYWlsdG86dmFsZXJpZS5kdWJvc3RAb3JhbmcNCgllLmNvbQ0KQVRURU5ERUU7Q049IkRVTU9OVCBTZWJhc3RpZW4gT0YvRFNJRiI7UlNWUD1UUlVFOm1haWx0bzpzZWJhc3RpZW4uZHVtb250QG9yDQoJYW5nZS5jb20NCkFUVEVOREVFO0NOPSJFTCBLQURJUkkgU291ZmlhbmUgRXh0IE9GL0RTSUYiO1JTVlA9VFJVRTptYWlsdG86c2Vsa2FkaXJpLmV4dA0KCUBvcmFuZ2UuY29tDQpBVFRFTkRFRTtDTj0iRU1TQUxFTSBNYWdhbGkgRE1HUC9ETU0iO1JTVlA9VFJVRTptYWlsdG86bWFnYWxpLmVtc2FsZW1Ab3JhbmcNCgllLmNvbQ0KQVRURU5ERUU7Q049IkVZTUVSWSBKZWFuLU1hcmMgT0YvRFNJRiI7UlNWUD1UUlVFOm1haWx0bzpqZWFubWFyYy5leW1lcnlAb3JhDQoJbmdlLmNvbQ0KQVRURU5ERUU7Q049IkZFUlJBTkQgQWxleGFuZHJlIERURi9ERVMiO1JTVlA9VFJVRTptYWlsdG86YWxleGFuZHJlLmZlcnJhbmRADQoJb3JhbmdlLmNvbQ0KQVRURU5ERUU7Q049IkZFUlJPTiBCcnVubyBPRi9EUkNHUCI7UlNWUD1UUlVFOm1haWx0bzpicnVuby5mZXJyb25Ab3JhbmdlLmNvDQoJbQ0KQVRURU5ERUU7Q049IkZMRU9VVEVSIEF1cmVsaWVuIERNR1AvRE5VIjtSU1ZQPVRSVUU6bWFpbHRvOmF1cmVsaWVuLmZsZW91dGVyDQoJQG9yYW5nZS5jb20NCkFUVEVOREVFO0NOPSJGT05URVMgSmVhbi1QaWVycmUgT0YvRFNJRiI7UlNWUD1UUlVFOm1haWx0bzpqZWFucGllcnJlLmZvbnRlcw0KCUBvcmFuZ2UuY29tDQpBVFRFTkRFRTtDTj0iR0FCSUxMWSBCZXJuYXJkIE9GL0RSQ0dQIjtSU1ZQPVRSVUU6bWFpbHRvOmJlcm5hcmQuZ2FiaWxseUBvcmENCgluZ2UuY29tDQpBVFRFTkRFRTtDTj0iR0FSTklFUiBFbWlsaWUgRE1HUCI7UlNWUD1UUlVFOm1haWx0bzplbWlsaWUuZ2FybmllckBvcmFuZ2UuY28NCgltDQpBVFRFTkRFRTtDTj0iR0FTQ09OIEdlcmFsZGluZSBETUdQL0RNTSI7UlNWUD1UUlVFOm1haWx0bzpnZXJhbGRpbmUuZ2FzY29uQG8NCglyYW5nZS5jb20NCkFUVEVOREVFO0NOPSJHQVNJT1JPV1NLSSBQaWVycmUgU09GUkVDT00iO1JTVlA9VFJVRTptYWlsdG86cGllcnJlLmdhc2lvcm93cw0KCWtpQHNvZnJlY29tLmNvbQ0KQVRURU5ERUU7Q049IkdBVVRIRVJBVCBDaHJpc3RvcGhlIE9GL0RTSUYiO1JTVlA9VFJVRTptYWlsdG86Y2hyaXN0b3BoZS5nYXV0DQoJaGVyYXRAb3JhbmdlLmNvbQ0KQVRURU5ERUU7Q049IkdCQUdVSURJLUFMSUEgRWxpYW5lIERNR1AvRE1NIjtSU1ZQPVRSVUU6bWFpbHRvOmVsaWFuZS5nYmFndWlkDQoJaWFsaWFAb3JhbmdlLmNvbQ0KQVRURU5ERUU7Q049J2dlb3JnZXMucm9jY29AZ3JlZW4tY29uc2VpbC5jb20nO1JTVlA9VFJVRTptYWlsdG86J2dlb3JnZXMucm9jDQoJY29AZ3JlZW4tY29uc2VpbC5jb20nDQpBVFRFTkRFRTtDTj0iR8OJUkFSRCBSw6lnaW5lIE9GL0RRU0MiO1JTVlA9VFJVRTptYWlsdG86cmVnaW5lLmdlcmFyZEBvcmFuZ2UNCgkuY29tDQpBVFRFTkRFRTtDTj0iR09NSVMgQ2hyaXN0b3BoZSBPRi9EUkNHUCI7UlNWUD1UUlVFOm1haWx0bzpjaHJpc3RvcGhlLmdvbWlzQG8NCglyYW5nZS5jb20NCkFUVEVOREVFO0NOPSJHT1JJTiBNYXJpYW5uZSBETUdQL0RNTSI7UlNWUD1UUlVFOm1haWx0bzptYXJpYW5uZS5nb3JpbkBvcmFuZw0KCWUuY29tDQpBVFRFTkRFRTtDTj0iR09STklBSyBKYWNlayBEVEYvREVTIjtSU1ZQPVRSVUU6bWFpbHRvOmphY2VrLmdvcm5pYWtAb3JhbmdlLmMNCglvbQ0KQVRURU5ERUU7Q049IkdPVCBOaWNvbGFzIERNR1AvRE5VIjtSU1ZQPVRSVUU6bWFpbHRvOm5pY29sYXMuZ290QG9yYW5nZS5jb20NCkFUVEVOREVFO0NOPSJHT1VQSUwtQU5EUkVBU1NJQU4gVsOpcm9uaXF1ZSBEQ0dQL0Q0QyI7UlNWUD1UUlVFOm1haWx0bzp2ZXJvbg0KCWlxdWUuZ291cGlsQG9yYW5nZS5jb20NCkFUVEVOREVFO0NOPSJHUklORU5XQUxEIENsYWlyZSBETUdQL0RNTSI7UlNWUD1UUlVFOm1haWx0bzpjbGFpcmUuZ3JpbmVud2FsZA0KCUBvcmFuZ2UuY29tDQpBVFRFTkRFRTtDTj0iR1JJU0lFUiBDeXJpbCBPRi9EU0lGIjtSU1ZQPVRSVUU6bWFpbHRvOmN5cmlsLmdyaXNpZXJAb3JhbmdlLmMNCglvbQ0KQVRURU5ERUU7Q049IkdVRU5BSVJFIENocmlzdG9waGUgT0YvRFJDR1AiO1JTVlA9VFJVRTptYWlsdG86Y2hyaXN0b3BoZS5ndWVuDQoJYWlyZUBvcmFuZ2UuY29tDQpBVFRFTkRFRTtDTj0iR1VJU05FVCBBbm5lIERNR1AiO1JTVlA9VFJVRTptYWlsdG86YW5uZS5ndWlzbmV0QG9yYW5nZS5jb20NCkFUVEVOREVFO0NOPSJIQURET1VDSEUgUmFkaWEgT0YvRFJDR1AiO1JTVlA9VFJVRTptYWlsdG86cmFkaWEuaGFkZG91Y2hlQG9yYQ0KCW5nZS5jb20NCkFUVEVOREVFO0NOPSJIQU1NT1VNSSBTYW1pYSBPRi9EUkNHUCI7UlNWUD1UUlVFOm1haWx0bzpzYW1pYS5oYW1tb3VtaUBvcmFuZw0KCWUuY29tDQpBVFRFTkRFRTtDTj0iSEFSRFkgRmFubnkgRENHUC9ENEMiO1JTVlA9VFJVRTptYWlsdG86ZmFubnkuaGFyZHlAb3JhbmdlLmNvbQ0KQVRURU5ERUU7Q049IkhFQlLDiSBKw6lyw6ltaWUgRE9JREYvUEFSTiI7UlNWUD1UUlVFOm1haWx0bzpqZXJlbWllLmhlYnJlQG9yDQoJYW5nZS5jb20NCkFUVEVOREVFO0NOPSJIT1ZFIEFudGhvbnkgRE1HUC9ETU0iO1JTVlA9VFJVRTptYWlsdG86YW50aG9ueS5ob3ZlQG9yYW5nZS5jbw0KCW0NCkFUVEVOREVFO0NOPSJJR1JPVUZBIEhpYmEgRXh0IE9GL0RTSUYiO1JTVlA9VFJVRTptYWlsdG86aGlncm91ZmEuZXh0QG9yYW5nZQ0KCS5jb20NCkFUVEVOREVFO0NOPSJKQUNRVUVUIE15cmlhbSBPRi9EUkNHUCI7UlNWUD1UUlVFOm1haWx0bzpteXJpYW0uamFjcXVldEBvcmFuZw0KCWUuY29tDQpBVFRFTkRFRTtDTj0iSkFNRVQgQ2xvdGhpbGRlIE9GL0RSQ0dQIjtSU1ZQPVRSVUU6bWFpbHRvOmNsb3RoaWxkZS5qYW1ldEBvcmENCgluZ2UuY29tDQpBVFRFTkRFRTtDTj0iSkFORE9UIEZhYmllbm5lIE9GL0RSQ0dQIjtSU1ZQPVRSVUU6bWFpbHRvOmZhYmllbm5lLmphbmRvdEBvcmENCgluZ2UuY29tDQpBVFRFTkRFRTtDTj0iSk9BTyBQYXRyaWNrIERNR1AvRE1NIjtSU1ZQPVRSVUU6bWFpbHRvOnBhdHJpY2suam9hb0BvcmFuZ2UuY28NCgltDQpBVFRFTkRFRTtDTj0iSk9MSVZFVCBGbG9yZW50IE9GL0RTSUYiO1JTVlA9VFJVRTptYWlsdG86ZmxvcmVudC5qb2xpdmV0QG9yYW4NCglnZS5jb20NCkFUVEVOREVFO0NOPSJKT1VMSU4gTWFyaWUgUGF1bGUgRkcvRENURyI7UlNWUD1UUlVFOm1haWx0bzptYXJpZXBhdWxlLmpvdWxpbg0KCUBvcmFuZ2UuY29tDQpBVFRFTkRFRTtDTj0iS0VSWUhVRUwgQ2hsb2UgRE1HUC9ETU0iO1JTVlA9VFJVRTptYWlsdG86Y2hsb2Uua2VyeWh1ZWxAb3JhbmcNCgllLmNvbQ0KQVRURU5ERUU7Q049IktIQUxGQSBOZWlsYSBPRi9EU0lGIjtSU1ZQPVRSVUU6bWFpbHRvOm5laWxhLmtoYWxmYUBvcmFuZ2UuY29tDQpBVFRFTkRFRTtDTj0iS09DSE5FVkEgT2xnYSBPRi9EUkNHUCI7UlNWUD1UUlVFOmludmFsaWQ6bm9tYWlsDQpBVFRFTkRFRTtDTj0iTEFIWUFORSBGYWl6YSBEVEYvREVTIjtSU1ZQPVRSVUU6bWFpbHRvOmZhaXphLmxhaHlhbmVAb3JhbmdlLmMNCglvbQ0KQVRURU5ERUU7Q049IkxBTVJJIFNhbWlhIERNR1AvRE1NIjtSU1ZQPVRSVUU6bWFpbHRvOnNhbWlhLmxhbXJpQG9yYW5nZS5jb20NCkFUVEVOREVFO0NOPSJMRCBDQVNUT1IgQ0FUQUxPR1VFIjtSU1ZQPVRSVUU6bWFpbHRvOmNhc3Rvci5jYXRhbG9ndWVAb3JhbmdlLg0KCWNvbQ0KQVRURU5ERUU7Q049IkxEIENPT1JESU5BVElPTiBDQVRBTE9HVUUiO1JTVlA9VFJVRTptYWlsdG86Y29vcmRpbmF0aW9uLmNhdGFsDQoJb2d1ZUBvcmFuZ2UuY29tDQpBVFRFTkRFRTtDTj0iTEQgT0YgRERTLUJpbGxpbmctREcyUC1DYXQgQ2FsIjtSU1ZQPVRSVUU6bWFpbHRvOmxkZGRzLmJpbGxpbmcNCglkZzJwY2F0Y2lhbEBvcmFuZ2UuY29tDQpBVFRFTkRFRTtDTj0iTEUgTUFSRUMgR2HDq2xsZSBETUdQL0RNTSI7UlNWUD1UUlVFOm1haWx0bzpnYWVsbGUubGVtYXJlY0BvcmENCgluZ2UuY29tDQpBVFRFTkRFRTtDTj0iTEVDSEVSVlkgWXZlcyBPRi9EUkNHUCI7UlNWUD1UUlVFOm1haWx0bzp5dmVzLmxlY2hlcnZ5QG9yYW5nZS4NCgljb20NCkFUVEVOREVFO0NOPSJMRUZFVVZSRSBQYXNjYWwgSU1UL0RDL0RTIjtSU1ZQPVRSVUU6bWFpbHRvOnBhc2NhbC5sZWZldXZyZUBvcg0KCWFuZ2UuY29tDQpBVFRFTkRFRTtDTj0iTEVHUkFORCBHcmVnb3J5IERUUlMvRE9TTSI7UlNWUD1UUlVFOm1haWx0bzpncmVnb3J5LmxlZ3JhbmRAb3INCglhbmdlLmNvbQ0KQVRURU5ERUU7Q049IkxFVE9VUk5FTCBBbm5lLUNsYWlyZSBETUdQIjtSU1ZQPVRSVUU6bWFpbHRvOmFubmVjbGFpcmUubGV0b3VyDQoJbmVsQG9yYW5nZS5jb20NCkFUVEVOREVFO0NOPSJMRVRVUlFVRSBEZWxwaGluZSBETUdQL0RNTSI7UlNWUD1UUlVFOm1haWx0bzpkZWxwaGluZS5sZXR1cnF1ZQ0KCUBvcmFuZ2UuY29tDQpBVFRFTkRFRTtDTj0iTEkgWWFxaSBETUdQL0RNTSI7UlNWUD1UUlVFOm1haWx0bzp5YXFpLmxpQG9yYW5nZS5jb20NCkFUVEVOREVFO0NOPSJMSU5HSUJFIExpbmUgRE1HUC9ETU0iO1JTVlA9VFJVRTptYWlsdG86bGluZS5saW5naWJlQG9yYW5nZS5jbw0KCW0NCkFUVEVOREVFO0NOPSJMT0lBTCBMdWMgSHViZXJ0IE9GL0RTSUYiO1JTVlA9VFJVRTptYWlsdG86bHVjaHViZXJ0LmxvaWFsQG9yYQ0KCW5nZS5jb20NCkFUVEVOREVFO0NOPSJMT1AgTHlkaWUgT0YvRFJDR1AiO1JTVlA9VFJVRTptYWlsdG86bHlkaWUubG9wQG9yYW5nZS5jb20NCkFUVEVOREVFO0NOPSJMT1VJUyBNQVJJRSBSYXBoYWVsIE9GL0RSQ0dQIjtSU1ZQPVRSVUU6bWFpbHRvOnJhcGhhZWwubG91aXNtYQ0KCXJpZUBvcmFuZ2UuY29tDQpBVFRFTkRFRTtDTj0iTFVCRVQgUGllcnJlLUdpbGxlcyBPRi9EU0lGIjtSU1ZQPVRSVUU6bWFpbHRvOnBpZXJyZWdpbGxlcy5sdWINCglldEBvcmFuZ2UuY29tDQpBVFRFTkRFRTtDTj0iTFVDSUFOSSBTdMOpcGhhbmUgRFRSUy9ET1NNIjtSU1ZQPVRSVUU6bWFpbHRvOnN0ZXBoYW5lLmx1Y2lhbmkNCglAb3JhbmdlLmNvbQ0KQVRURU5ERUU7Q049Ik1BSVNPTk5FVVZFIEZhYmllbm5lIERNR1AiO1JTVlA9VFJVRTptYWlsdG86ZmFiaWVubmUubWFpc29ubmV1DQoJdmVAb3JhbmdlLmNvbQ0KQVRURU5ERUU7Q049Ik1BUkNVVEEgTmFkaWEgRFRSUy9ET1NNIjtSU1ZQPVRSVUU6bWFpbHRvOm5hZGlhLm1hcmN1dGFAb3JhbmdlDQoJLmNvbQ0KQVRURU5ERUU7Q049Ik1BUlFVRVMgTXVyaWVsIE9GL0RSQ0dQIjtSU1ZQPVRSVUU6bWFpbHRvOm11cmllbC5tYXJxdWVzQG9yYW5nDQoJZS5jb20NCkFUVEVOREVFO0NOPSJNQVJTQVVEIENobG9lIERNR1AvRE1NIjtSU1ZQPVRSVUU6bWFpbHRvOmNobG9lLm1hcnNhdWRAb3JhbmdlLg0KCWNvbQ0KQVRURU5ERUU7Q049Ik1BUlRJTiBCcnVubyBFeHQgT0YvRFNJRiI7UlNWUD1UUlVFOm1haWx0bzpibWFydGluLmV4dEBvcmFuZ2UuDQoJY29tDQpBVFRFTkRFRTtDTj0iTUFUSElFVSBEYXZpZCBPRi9EUkNHUCI7UlNWUD1UUlVFOm1haWx0bzpkYXZpZC5tYXRoaWV1QG9yYW5nZS4NCgljb20NCkFUVEVOREVFO0NOPSJNRVBQSUVMIEFtZWxpZSBETUdQL0RNTSI7UlNWUD1UUlVFOm1haWx0bzphbWVsaWUubWVwcGllbEBvcmFuZw0KCWUuY29tDQpBVFRFTkRFRTtDTj0iTUlDSEVMT1QgQ29yaW5uZSBPRi9EUkNHUCI7UlNWUD1UUlVFOm1haWx0bzpjb3Jpbm5lLm1pY2hlbG90QG8NCglyYW5nZS5jb20NCkFUVEVOREVFO0NOPSJNT1NOSUVSIExvw69jIE9GL0RTSUYiO1JTVlA9VFJVRTptYWlsdG86bG9pYy5tb3NuaWVyQG9yYW5nZS5jbw0KCW0NCkFUVEVOREVFO0NOPSJNT1VHQU1BRE9VIERqYWhhZmFyIEV4dCBPRi9EU0lGIjtSU1ZQPVRSVUU6bWFpbHRvOmRtb3VnYW1hZG91Lg0KCWV4dEBvcmFuZ2UuY29tDQpBVFRFTkRFRTtDTj0iTU9VU1NFVCBDbGFpcmUgRE1HUCI7UlNWUD1UUlVFOm1haWx0bzpjbGFpcmUubW91c3NldEBvcmFuZ2UuY28NCgltDQpBVFRFTkRFRTtDTj0iTVVSQVQgTWljaGVsIE9GL0RTSUYiO1JTVlA9VFJVRTptYWlsdG86bWljaGVsLm11cmF0QG9yYW5nZS5jb20NCkFUVEVOREVFO0NOPSJOT0xPUkdVRVMgQ2xhdWRlIElzYWJlbGxlIERNR1AvRE1NIjtSU1ZQPVRSVUU6bWFpbHRvOmNsYXVkZWlzYQ0KCWJlbGxlLm5vbG9yZ3Vlc0BvcmFuZ2UuY29tDQpBVFRFTkRFRTtDTj0nb2xpdmllci52YW5zb25AZ3JlZW4tY29uc2VpbC5jb20nO1JTVlA9VFJVRTptYWlsdG86J29saXZpZXIudmENCgluc29uQGdyZWVuLWNvbnNlaWwuY29tJw0KQVRURU5ERUU7Q049Ik9SQkFJIENvcm5lbCBEVFJTL0RPU00iO1JTVlA9VFJVRTptYWlsdG86Y29ybmVsLm9yYmFpQG9yYW5nZS5jDQoJb20NCkFUVEVOREVFO0NOPSJPUklPTEkgRmFiaWVuIERNR1AvRE1NIjtSU1ZQPVRSVUU6bWFpbHRvOmZhYmllbi5vcmlvbGlAb3JhbmdlLg0KCWNvbQ0KQVRURU5ERUU7Q049IlBBUEFEQUNDSSBIw6lsw6huZSBPRi9EU0lGIjtSU1ZQPVRSVUU6bWFpbHRvOmhlbGVuZS5wYXBhZGFjY2lADQoJb3JhbmdlLmNvbQ0KQVRURU5ERUU7Q049IlBBU1FVSUVSIEF1ZHJleSBEVFJTL0RPU00iO1JTVlA9VFJVRTptYWlsdG86YXVkcmV5LnBhc3F1aWVyQG9yDQoJYW5nZS5jb20NCkFUVEVOREVFO0NOPSJQQVNRVUlFUiBMYXVyaWFubmUgRE1HUC9ETU0iO1JTVlA9VFJVRTptYWlsdG86bGF1cmlhbm5lLnBhc3F1aQ0KCWVyQG9yYW5nZS5jb20NCkFUVEVOREVFO0NOPSJQRVJST1QgQ2FyaW5lIE9GL0RSQ0dQIjtSU1ZQPVRSVUU6bWFpbHRvOmNhcmluZS5wZXJyb3RAb3JhbmdlLg0KCWNvbQ0KQVRURU5ERUU7Q049IlBJQ0NJT05FIFLDqW1pIERDR1AvRDRDIjtSU1ZQPVRSVUU6bWFpbHRvOnJlbWkucGljY2lvbmVAb3JhbmdlDQoJLmNvbQ0KQVRURU5ERUU7Q049IlBJRVJSRSBGcmFuw6dvaXMgRE1HUCI7UlNWUD1UUlVFOm1haWx0bzpmcmFuY29pcy5waWVycmVAb3JhbmdlDQoJLmNvbQ0KQVRURU5ERUU7Q049IlBPSVJJRVIgTWF0dGhpZXUgRXh0IE9GL0RSQ0dQIjtSU1ZQPVRSVUU6bWFpbHRvOm1wb2lyaWVyLmV4dEBvDQoJcmFuZ2UuY29tDQpBVFRFTkRFRTtDTj0iUFVHSU5JRVIgSmVhbi1NYXJjIE9GL0RTSUYiO1JTVlA9VFJVRTptYWlsdG86amVhbi1tYXJjLnB1Z2luaWUNCglyQG9yYW5nZS5jb20NCkFUVEVOREVFO0NOPSJQVVlUIEFubmUgT1dGL0RPUE0iO1JTVlA9VFJVRTptYWlsdG86YW5uZS5wdXl0QG9yYW5nZS5jb20NCkFUVEVOREVFO0NOPSJSQU5HT00gTWFyYyBEVFJTL0RPU0lQIjtSU1ZQPVRSVUU6bWFpbHRvOm1hcmMucmFuZ29tQG9yYW5nZS5jbw0KCW0NCkFUVEVOREVFO0NOPSJSRVkgQ2hyaXN0b3BoZSBPRi9EU0lGIjtSU1ZQPVRSVUU6bWFpbHRvOmNocmlzdG9waGUucmV5QG9yYW5nZQ0KCS5jb20NCkFUVEVOREVFO0NOPSJST0RSSUdVRVMgQW5hIERNR1AiO1JTVlA9VFJVRTptYWlsdG86YW5hLnJvZHJpZ3Vlc0BvcmFuZ2UuY29tDQpBVFRFTkRFRTtDTj0iUk9EUklHVUVTIEFubmUgTWFyaWUgT0YvRFJDR1AiO1JTVlA9VFJVRTptYWlsdG86YW5uZW1hcmllLnJvZHINCglpZ3Vlc0BvcmFuZ2UuY29tDQpBVFRFTkRFRTtDTj0iUk9HRVIgREUgR0FSREVMTEUgVGhpYmF1bHQgT1dGL0RPUE0iO1JTVlA9VFJVRTptYWlsdG86dGhpYmF1bHQNCgkucm9nZXJkZWdhcmRlbGxlQG9yYW5nZS5jb20NCkFUVEVOREVFO0NOPSJST1JHVUVTIFRob21hcyBEQ0dQL0Q0QyI7UlNWUD1UUlVFOmludmFsaWQ6bm9tYWlsDQpBVFRFTkRFRTtDTj0iUk9TQSBTb3BoaWUgRE1HUCI7UlNWUD1UUlVFOm1haWx0bzpzb3BoaWUucm9zYUBvcmFuZ2UuY29tDQpBVFRFTkRFRTtDTj0iUk9ZIENocmlzdGluZSBPRi9EUkNHUCI7UlNWUD1UUlVFOm1haWx0bzpjaHJpc3RpbmUucm95QG9yYW5nZS4NCgljb20NCkFUVEVOREVFO0NOPSJST1lFUkUgRGVscGhpbmUgT0YvRFJDR1AiO1JTVlA9VFJVRTptYWlsdG86ZGVscGhpbmUucm95ZXJlQG9yYQ0KCW5nZS5jb20NCkFUVEVOREVFO0NOPSJTQVJST1VJTEhFIEplYW4gTWljaGVsIE9GL0RTSUYiO1JTVlA9VFJVRTptYWlsdG86amVhbm1pY2hlbC5zYQ0KCXJyb3VpbGhlQG9yYW5nZS5jb20NCkFUVEVOREVFO0NOPSJTQVVMTklFUiBKZWFuIERDR1AvRFBTQyI7UlNWUD1UUlVFOm1haWx0bzpqZWFuMS5zYXVsbmllckBvcmFuZw0KCWUuY29tDQpBVFRFTkRFRTtDTj0iU0NFVEJVTiBNYXJpZSBETUdQL0RNTSI7UlNWUD1UUlVFOm1haWx0bzptYXJpZS5zY2V0YnVuQG9yYW5nZS4NCgljb20NCkFUVEVOREVFO0NOPSJTRVJFUyBKdWxpZW4gT0YvRFNJRiI7UlNWUD1UUlVFOm1haWx0bzpqdWxpZW4uc2VyZXNAb3JhbmdlLmNvbQ0KQVRURU5ERUU7Q049IlNFVkVMTEVDIEd1aWxsYXVtZSBFeHQgT0YvRFNJRiI7UlNWUD1UUlVFOm1haWx0bzpnc2V2ZWxsZWMuZXh0DQoJQG9yYW5nZS5jb20NCkFUVEVOREVFO0NOPSJTSUxMT04gU2FuZHJhIE9GL0RSQ0dQIjtSU1ZQPVRSVUU6bWFpbHRvOnNhbmRyYS5zaWxsb25Ab3JhbmdlLg0KCWNvbQ0KQVRURU5ERUU7Q049IlNUSE9SRVogU2ViYXN0aWVuIEV4dCBPRi9EU0lGIjtSU1ZQPVRSVUU6bWFpbHRvOnNzdGhvcmV6LmV4dEBvDQoJcmFuZ2UuY29tDQpBVFRFTkRFRTtDTj0iU1RPQ0NISSBDZWNpbGUgRE1HUC9ETU0iO1JTVlA9VFJVRTptYWlsdG86Y2VjaWxlLnN0b2NjaGlAb3JhbmcNCgllLmNvbQ0KQVRURU5ERUU7Q049IlNUUkFVTElOTyBTw6liYXN0aWVuIEFETyI7UlNWUD1UUlVFOm1haWx0bzpzZWJhc3RpZW4uc3RyYXVsaW5vDQoJQG9yYW5nZS5jb20NCkFUVEVOREVFO0NOPSJTWkFSWllOU0tJIEthcmluZSBPRi9EU0lGIjtSU1ZQPVRSVUU6bWFpbHRvOmthcmluZS5zemFyenluc2tpQA0KCW9yYW5nZS5jb20NCkFUVEVOREVFO0NOPSJUQUJBUlkgQWxpbmUgRE1HUCI7UlNWUD1UUlVFOm1haWx0bzphbGluZS50YWJhcnlAb3JhbmdlLmNvbQ0KQVRURU5ERUU7Q049IlRBQlRJLUFCSURBIExheWxhIE9GL0RSQ0dQIjtSU1ZQPVRSVUU6bWFpbHRvOmxheWxhLnRhYnRpYWJpZGFADQoJb3JhbmdlLmNvbQ0KQVRURU5ERUU7Q049IlRIRU9QSElMRSBMdWNpbmRhIERNR1AvRE1NIjtSU1ZQPVRSVUU6bWFpbHRvOmx1Y2luZGEudGhlb3BoaWxlDQoJQG9yYW5nZS5jb20NCkFUVEVOREVFO0NOPSJUT0RPUk9GRi1ERVNNT1VJTExJRVJFUyBGbG9yZW5jZSBPRi9EUkNHUCI7UlNWUD1UUlVFOm1haWx0bzpmbA0KCW9yZW5jZS50b2Rvcm9mZkBvcmFuZ2UuY29tDQpBVFRFTkRFRTtDTj0iVE9VQU1JIFNvbmlhIE9GL0RSQ0dQIjtSU1ZQPVRSVUU6bWFpbHRvOnNvbmlhLnRvdWFtaUBvcmFuZ2UuY28NCgltDQpBVFRFTkRFRTtDTj0iVE9VUkUgUEVHTk9VR08gUGF0cmljaWEgT0YvRFJDR1AiO1JTVlA9VFJVRTptYWlsdG86cGF0cmljaWEudG8NCgl1cmVAb3JhbmdlLmNvbQ0KQVRURU5ERUU7Q049IlRSQU4gRGlldSBMb2MgRE1HUCI7UlNWUD1UUlVFOm1haWx0bzpkaWV1bG9jLnRyYW5Ab3JhbmdlLmNvbQ0KQVRURU5ERUU7Q049IlVORyBCb25hIERNR1AvRE1NIjtSU1ZQPVRSVUU6bWFpbHRvOmJvbmEudW5nQG9yYW5nZS5jb20NCkFUVEVOREVFO0NOPSJVUklPVCBCSUxERVQgVmFsZXJpZSBETUdQIjtSU1ZQPVRSVUU6bWFpbHRvOnZhbGVyaWUudXJpb3RiaWxkZQ0KCXRAb3JhbmdlLmNvbQ0KQVRURU5ERUU7Q049IlZBSUxMQU5UIEFubmUgRFRGL0RFUyI7UlNWUD1UUlVFOm1haWx0bzphbm5lLnZhaWxsYW50QG9yYW5nZS5jDQoJb20NCkFUVEVOREVFO0NOPSJWQU4gT0VSUyBERSBQUkVTVCBMYXVyZSBETUdQL0RNTSI7UlNWUD1UUlVFOm1haWx0bzpsYXVyZS52YW5vZQ0KCXJzQG9yYW5nZS5jb20NCkFUVEVOREVFO0NOPSJWRVJHT1VXRU4gVGhvbWFzIERNR1AvRE1NIjtSU1ZQPVRSVUU6bWFpbHRvOnRob21hcy52ZXJnb3V3ZW5Abw0KCXJhbmdlLmNvbQ0KQVRURU5ERUU7Q049IlZFUklBVVggVmluY2VudCBETUdQL0ROVSI7UlNWUD1UUlVFOm1haWx0bzp2aW5jZW50LnZlcmlhdXhAb3JhDQoJbmdlLmNvbQ0KQVRURU5ERUU7Q049IlZJTEFJTkUgRWxvZGllIERUUlMvRElSTSI7UlNWUD1UUlVFOm1haWx0bzplbG9kaWUudmlsYWluZUBvcmFuDQoJZ2UuY29tDQpBVFRFTkRFRTtDTj0iWVVBTiBUaWFuIE9GL0RTSUYiO1JTVlA9VFJVRTptYWlsdG86dGlhbi55dWFuQG9yYW5nZS5jb20NCkFUVEVOREVFO0NOPSJaQUhSQU1BTkUgSGFzc2FuIE9GL0RTSUYiO1JTVlA9VFJVRTptYWlsdG86aGFzc2FuLnphaHJhbWFuZUBvcg0KCWFuZ2UuY29tDQpBVFRFTkRFRTtDTj0iWkVSUk9VIExvdW5lcyBETUdQIjtSU1ZQPVRSVUU6bWFpbHRvOmxvdW5lcy56ZXJyb3VAb3JhbmdlLmNvbQ0KQVRURU5ERUU7Q049IlpaWiBNT0EiO1JTVlA9VFJVRTptYWlsdG86c2VsZmNhcmUubG9Ab3JhbmdlLmNvbQ0KQVRURU5ERUU7Q049IkdBTFkgRnJhbmNvaXMgRE1HUCI7UlNWUD1UUlVFOm1haWx0bzpmcmFuY29pcy5nYWx5QG9yYW5nZS5jb20NCkFUVEVOREVFO0NOPSJHSUxMSUVSUyBIdWd1ZXMgRE1HUC9ETU0iO1JTVlA9VFJVRTptYWlsdG86aHVndWVzLmdpbGxpZXJzQG9yYQ0KCW5nZS5jb20NCkFUVEVOREVFO0NOPSJHVVNUQVZFIEp1ZGUgRXh0IE9GL0RTSUYiO1JTVlA9VFJVRTptYWlsdG86amd1c3RhdmUuZXh0QG9yYW5nZQ0KCS5jb20NCkFUVEVOREVFO0NOPSJQRVJST1QgQ3lyaWwgRE1HUCI7UlNWUD1UUlVFOm1haWx0bzpjeXJpbC5wZXJyb3RAb3JhbmdlLmNvbQ0KQVRURU5ERUU7Q049IlJPTExBTkQgQW50b255IEV4dCBPRi9EU0lGIjtSU1ZQPVRSVUU6bWFpbHRvOmFyb2xsYW5kLmV4dEBvcmFuDQoJZ2UuY29tDQpBVFRFTkRFRTtDTj0iSVlBQkkgTGF1cmVuY2UgT0YvRFNJRiI7UlNWUD1UUlVFOm1haWx0bzpsYXVyZW5jZS5peWFiaUBvcmFuZ2UNCgkuY29tDQpBVFRFTkRFRTtDTj1mcmFuY2tkYTc1QGdtYWlsLmNvbTtSU1ZQPVRSVUU6bWFpbHRvOmZyYW5ja2RhNzVAZ21haWwuY29tDQpBVFRFTkRFRTtDTj0iRkVOQVlST1UgQW5uZSBFeHQgT0YvRFNJRiI7UlNWUD1UUlVFOm1haWx0bzphZmVuYXlyb3UuZXh0QG9yYW4NCglnZS5jb20NCkFUVEVOREVFO0NOPSJMQVZBQlJFIENsw6ltZW50IE9GL0RTSUYiO1JTVlA9VFJVRTptYWlsdG86Y2xlbWVudC5sYXZhYnJlQG9yYQ0KCW5nZS5jb20NCkFUVEVOREVFO0NOPWNocmlzdG9waGUuY29tYmV0QGdyZWVuLWNvbnNlaWwuY29tO1JTVlA9VFJVRTptYWlsdG86Y2hyaXN0b3BoZQ0KCS5jb21iZXRAZ3JlZW4tY29uc2VpbC5jb20NCkFUVEVOREVFO0NOPW9saXZpZXIudmFuc29uQGdyZWVuLWNvbnNlaWwuY29tO1JTVlA9VFJVRTptYWlsdG86b2xpdmllci52YW5zbw0KCW5AZ3JlZW4tY29uc2VpbC5jb20NCkFUVEVOREVFO0NOPWdlb3JnZXMucm9jY29AZ3JlZW4tY29uc2VpbC5jb207UlNWUD1UUlVFOm1haWx0bzpnZW9yZ2VzLnJvY2NvQA0KCWdyZWVuLWNvbnNlaWwuY29tDQpBVFRFTkRFRTtDTj0iUklWSUVSRSBTdMOpcGhhbmUgRXh0IE9GL0RTSUYiO1JPTEU9T1BULVBBUlRJQ0lQQU5UO1JTVlA9VFJVRToNCgltYWlsdG86c3JpdmllcmUuZXh0QG9yYW5nZS5jb20NCkFUVEVOREVFO0NOPSJBSVJBVUxUIEFybmF1ZCBFeHQgT0YvRFNJRiI7Uk9MRT1PUFQtUEFSVElDSVBBTlQ7UlNWUD1UUlVFOm1haQ0KCWx0bzphcmFpcmF1bHQuZXh0QG9yYW5nZS5jb20NCkFUVEVOREVFO0NOPSJCRU4gREpFTUlBIElidGlzc2VtIEV4dCBPRi9EU0lGIjtST0xFPU9QVC1QQVJUSUNJUEFOVDtSU1ZQPVRSVQ0KCUU6bWFpbHRvOmliZW5kamVtaWEuZXh0QG9yYW5nZS5jb20NCkFUVEVOREVFO0NOPSJIVUlUT1JFTCBGbG9yaW5lIEV4dCBPRi9EU0lGIjtST0xFPU9QVC1QQVJUSUNJUEFOVDtSU1ZQPVRSVUU6bQ0KCWFpbHRvOmZodWl0b3JlbC5leHRAb3JhbmdlLmNvbQ0KQVRURU5ERUU7Q049IlBPVElFUiBTZXJnZSBFeHQgT0YvRFNJRiI7Uk9MRT1PUFQtUEFSVElDSVBBTlQ7UlNWUD1UUlVFOm1haWx0DQoJbzpzcG90aWVyLmV4dEBvcmFuZ2UuY29tDQpBVFRFTkRFRTtDTj0iVkVUVEVSIEJlYXRyaWNlIEV4dCBPRi9EU0lGIjtST0xFPU9QVC1QQVJUSUNJUEFOVDtSU1ZQPVRSVUU6bWENCglpbHRvOmJ2ZXR0ZXIuZXh0QG9yYW5nZS5jb20NCkFUVEVOREVFO0NOPSJNT1VURU5FVCBBZHJpZW4gRE1HUCI7Uk9MRT1PUFQtUEFSVElDSVBBTlQ7UlNWUD1UUlVFOm1haWx0bzphZA0KCXJpZW4ubW91dGVuZXRAb3JhbmdlLmNvbQ0KQ0xBU1M6UFVCTElDDQpDUkVBVEVEOjIwMTQwNDAzVDEzMjIyOFoNCkRFU0NSSVBUSU9OOlF1YW5kIDogbWFyZGkgMjIgYXZyaWwgMjAxNCAxMDowMC0xNzowMCAoR01UKzAxOjAwKSBCcnV4ZWxsZXMsDQoJIENvcGVuaGFndWUsIE1hZHJpZCwgUGFyaXMubkVtcGxhY2VtZW50IDogUG9udCA6IDAxIDU4IDcyIDM1IDE0IC8gQ29vcG4NCglldCA6IGRhb21haSA7IG1kcCA6IDIyMDUyMDE0bm5SZW1hcnF1ZSA6IGxlIGTDqWNhbGFnZSBHTVQgY2ktZGVzc3VzIG5lIA0KCXRpZW50IHBhcyBjb21wdGUgZGVzIHLDqWdsYWdlcyBkZSBsJ2hldXJlIGQnw6l0w6kubm4qfip+Kn4qfip+Kn4qfip+Kn4qDQoJbm5Cb25qb3VyLG5uVm9pY2kgbGVzIGxpZW5zIHByIHZvdXMgY29ubmVjdGVyIMOgIGxhIGNvb3BuZXQgOiBubkJvbmoNCglvdXIsIG5uTm91cyB2b3VzIGNvbmZpcm1vbnMgbGEgcGxhbmlmaWNhdGlvbiBkZSB2b3RyZSBjb25mw6lyZW5jZS4gbk5vDQoJbQlNb3QgZGUgcGFzc2UJTsKwIGRlIHBvbnQJRGF0ZSAoQUFBQS1NTS1KSikJSGV1cmUgZGUgZMOpYnV0CUZ1c2VhdXggaG9yYWkNCglyZQluZGFvbWFpCTIyMDUyMDE0CS0JMjAxNC0wNC0yMgkxMDowMAkoR01UKzAxOjAwKSBCcnV4ZWxsZXMsIENvcGVuaGFndWUNCgksIE1hZHJpZCwgUGFyaXMgKGhldXJlIGQnw6l0w6kpCW5uVm91cyBwb3V2ZXogZm91cm5pciDDoCB2b3MgaW52aXTDqXMgDQoJbGVzIGxpZW5zIHN1aXZhbnRzIHBvdXIgbGV1ciBwZXJtZXR0cmUgZGUgcmVqb2luZHJlIGxhIGNvbmbDqXJlbmNlIGZhY2lsZW0NCgllbnQgZW4gcXVlbHF1ZXMgY2xpY3MgOiBuKglkZXB1aXMgSU5UUkFORVQgOiBjbGlxdWV6IGljaSA8aHR0cHM6Ly9tb25zaS5zDQoJc28uZnJhbmNldGVsZWNvbS5mci9pbmRleC5hc3A/dGFyZ2V0PUhUVFAlM0ElMkYlMkZjb29wbmV0LnNzby5mcmFuY2V0ZWxlY28NCgltLmZyJTJGRGVmYXVsdC5hc3B4JTNmUmV0dXJuVXJsJTNkJTI1MmZEaXJlY3RBY2Nlc3MlMjUyZlN0YXJ0Q29uZmVyZW5jZUJ5VQ0KCXJsLmFzcHglMjUzZmNwSWQlMjUzZEUxM0JBNjE2LUZFRUMtNEE2MC1CNjA1LTYxOEY1OTJCNjk0Nz4gIG4qCWRlcHVpcyBJTlQNCglFUk5FVCA6IGNsaXF1ZXogaWNpIDxodHRwczovL2Nvb3BuZXQubXVsdGltZWRpYS1jb25mZXJlbmNlLm9yYW5nZS1idXNpbmVzcw0KCS5jb20vRGlyZWN0QWNjZXNzL1N0YXJ0Q29uZmVyZW5jZUJ5VXJsLmFzcHg/Y3BJZD1FMTNCQTYxNi1GRUVDLTRBNjAtQjYwNS02DQoJMThGNTkyQjY5NDc+ICBubm5uUmUsbm5MYSBzZWNvbmRlIHLDqXVuaW9uIGRlIERBTyBhdXJhIGJpZW4gbGlldSBsZQ0KCSAyMi8wNCBldCBub24gbGUgMjIvMDUgY29tbWUgbWVudGlvbm7DqSBkYW5zIGxhIDHDqHJlIGludml0YXRpb24gOi0pbm5CaQ0KCWVuIGNkdCxubkF1ZHJleW4NCkRURU5EO1RaSUQ9IlJvbWFuY2UgU3RhbmRhcmQgVGltZSI6MjAxNDA0MjJUMTcwMDAwDQpEVFNUQU1QOjIwMTQwNDExVDA5MjcxNloNCkRUU1RBUlQ7VFpJRD0iUm9tYW5jZSBTdGFuZGFyZCBUaW1lIjoyMDE0MDQyMlQxMDAwMDANCkxBU1QtTU9ESUZJRUQ6MjAxNDA0MjVUMjExOTUxWg0KTE9DQVRJT046UG9udCA6IDAxIDU4IDcyIDM1IDE0IC8gQ29vcG5ldCA6IGRhb21haSA7IG1kcCA6IDIyMDUyMDE0DQpPUkdBTklaRVI7Q049IkJFTExBSUNIRSBBdWRyZXkgRXh0IE9GL0RTSUYiOm1haWx0bzphYmVsbGFpY2hlLmV4dEBvcmFuZ2UuY28NCgltDQpQUklPUklUWTo1DQpTRVFVRU5DRToxDQpTVU1NQVJZO0xBTkdVQUdFPWZyOltUQSAyMiBtYWkgMjAxNF1Sw6l1bmlvbiBkZSBEQU8NClRSQU5TUDpPUEFRVUUNClVJRDowNDAwMDAwMDgyMDBFMDAwNzRDNUI3MTAxQTgyRTAwODAwMDAwMDAwQzA4RkY5OEI1MDRGQ0YwMTAwMDAwMDAwMDAwMDAwMA0KCTAxMDAwMDAwMEJFMUJEM0I1M0I5OUZGNDY4QTY0MEM3MDEyNzlDODczDQpYLUFMVC1ERVNDO0ZNVFRZUEU9dGV4dC9odG1sOjwhRE9DVFlQRSBIVE1MIFBVQkxJQyAiLS8vVzNDLy9EVEQgSFRNTCAzLjIvL0UNCglOIj5uPEhUTUw+bjxIRUFEPm48TUVUQSBOQU1FPSJHZW5lcmF0b3IiIENPTlRFTlQ9Ik1TIEV4Y2hhbmdlIFNlcnZlciB2ZQ0KCXJzaW9uIDE0LjAyLjUwMDQuMDAwIj5uPFRJVExFPjwvVElUTEU+bjwvSEVBRD5uPEJPRFk+bjwhLS0gQ29udmVydGVkIGYNCglyb20gdGV4dC9ydGYgZm9ybWF0IC0tPm5uPFAgRElSPUxUUj48U1BBTiBMQU5HPSJmciI+PEZPTlQgRkFDRT0iQ2FsaWJyaSINCgk+UXVhbmQgOiBtYXJkaSAyMiBhdnJpbCAyMDE0IDEwOjAwLTE3OjAwIChHTVQrMDE6MDApIEJydXhlbGxlcywgQ29wZW5oYWd1DQoJZSwgTWFkcmlkLCBQYXJpcy48L0ZPTlQ+PC9TUEFOPjwvUD5ubjxQIERJUj1MVFI+PFNQQU4gTEFORz0iZnIiPjxGT05UIA0KCUZBQ0U9IkNhbGlicmkiPkVtcGxhY2VtZW50IDogUG9udCA6IDAxIDU4IDcyIDM1IDE0IC8gQ29vcG5ldCA6IGRhb21haSA7IG0NCglkcCA6IDIyMDUyMDE0PC9GT05UPjwvU1BBTj48L1A+bm48UCBESVI9TFRSPjxTUEFOIExBTkc9ImZyIj48Rk9OVCBGQUNFPSINCglDYWxpYnJpIj5SZW1hcnF1ZSA6IGxlIGTDqWNhbGFnZSBHTVQgY2ktZGVzc3VzIG5lIHRpZW50IHBhcyBjb21wdGUgZGVzIHLDqQ0KCWdsYWdlcyBkZSBsJ2hldXJlIGQnw6l0w6kuPC9GT05UPjwvU1BBTj48L1A+bm48UCBESVI9TFRSPjxTUEFOIExBTkc9ImZyIg0KCT48Rk9OVCBGQUNFPSJDYWxpYnJpIj4qfip+Kn4qfip+Kn4qfip+Kn4qPC9GT05UPjwvU1BBTj48L1A+bm48UCBESVI9TFRSPg0KCTxTUEFOIExBTkc9ImZyIj48L1NQQU4+PFNQQU4gTEFORz0iZnIiPjwvU1BBTj48U1BBTiBMQU5HPSJmciI+PEZPTlQgU0laRT0yDQoJIEZBQ0U9IlRyZWJ1Y2hldCBNUyI+Qm9uam91ciw8L0ZPTlQ+PC9TUEFOPjwvUD5ubjxQIERJUj1MVFI+PFNQQU4gTEFORz0NCgkiZnIiPjxGT05UIFNJWkU9MiBGQUNFPSJUcmVidWNoZXQgTVMiPlZvaWNpIGxlcyBsaWVucyBwciB2b3VzIGNvbm5lY3RlciDDoA0KCSBsYSBjb29wbmV0wqA6IDwvRk9OVD48L1NQQU4+PC9QPm5uPFAgRElSPUxUUj48U1BBTiBMQU5HPSJmciI+PC9TUEFOPjxTUA0KCUFOIExBTkc9ImZyIj48L1NQQU4+PFNQQU4gTEFORz0iZnIiPjxGT05UIFNJWkU9MiBGQUNFPSJBcmlhbCI+Qm9uam91ciw8QlINCgk+bjxCUj5uTm91cyB2b3VzIGNvbmZpcm1vbnMgbGEgcGxhbmlmaWNhdGlvbiBkZSB2b3RyZSBjb25mw6lyZW5jZS4gPC9GT04NCglUPjwvU1BBTj48L1A+bm48UCBESVI9TFRSIEFMSUdOPUNFTlRFUj48U1BBTiBMQU5HPSJmciI+PEI+PEZPTlQgRkFDRT0iQ2ENCglsaWJyaSI+Tm9tPC9GT05UPjwvQj48L1NQQU4+PFNQQU4gTEFORz0iZnIiPjxCPjwvQj48L1NQQU4+PFNQQU4gTEFORz0iZnIiPg0KCTxCPiZuYnNwOyZuYnNwOyZuYnNwOyZuYnNwOzwvQj48L1NQQU4+PFNQQU4gTEFORz0iZnIiPjxCPiA8Rk9OVCBGQUNFPSINCglDYWxpYnJpIj5Nb3QgZGUgcGFzc2U8L0ZPTlQ+PC9CPjwvU1BBTj48U1BBTiBMQU5HPSJmciI+PEI+PC9CPjwvU1BBTj48U1BBTg0KCSBMQU5HPSJmciI+PEI+Jm5ic3A7Jm5ic3A7Jm5ic3A7PC9CPjwvU1BBTj48U1BBTiBMQU5HPSJmciI+PEI+IDxGT05UIEZBDQoJQ0U9IkNhbGlicmkiPk7CsCBkZSBwb250PC9GT05UPjwvQj48L1NQQU4+PFNQQU4gTEFORz0iZnIiPjxCPjwvQj48L1NQQU4+PFMNCglQQU4gTEFORz0iZnIiPjxCPiZuYnNwOyZuYnNwOyZuYnNwOyZuYnNwOyZuYnNwOzwvQj48L1NQQU4+PFNQQU4gTEFORz0NCgkiZnIiPjxCPiA8Rk9OVCBGQUNFPSJDYWxpYnJpIj5EYXRlIChBQUFBLU1NLUpKKTwvRk9OVD48L0I+PC9TUEFOPjxTUEFOIExBTg0KCUc9ImZyIj48Qj48L0I+PC9TUEFOPjxTUEFOIExBTkc9ImZyIj48Qj4mbmJzcDsmbmJzcDsmbmJzcDsmbmJzcDsmbmJzcA0KCTsmbmJzcDs8L0I+PC9TUEFOPjxTUEFOIExBTkc9ImZyIj48Qj4gPEZPTlQgRkFDRT0iQ2FsaWJyaSI+SGV1cmUgZGUgZMOpYnUNCgl0PC9GT05UPjwvQj48L1NQQU4+PFNQQU4gTEFORz0iZnIiPjxCPjwvQj48L1NQQU4+PFNQQU4gTEFORz0iZnIiPjxCPiZuYnNwDQoJOzwvQj48L1NQQU4+PFNQQU4gTEFORz0iZnIiPjxCPiA8Rk9OVCBGQUNFPSJDYWxpYnJpIj5GdXNlYXV4IGhvcmFpcmU8L0ZPTlQNCgk+PC9CPjwvU1BBTj48U1BBTiBMQU5HPSJmciI+PEI+PC9CPjwvU1BBTj48U1BBTiBMQU5HPSJmciI+PEI+PC9CPjwvU1BBTj48Uw0KCVBBTiBMQU5HPSJmciI+PC9TUEFOPjxTUEFOIExBTkc9ImZyIj48QlI+bjwvU1BBTj48U1BBTiBMQU5HPSJmciI+PEZPTlQgRkENCglDRT0iQ2FsaWJyaSI+ZGFvbWFpPC9GT05UPjwvU1BBTj48U1BBTiBMQU5HPSJmciI+PC9TUEFOPjxTUEFOIExBTkc9ImZyIj4mbg0KCWJzcDs8L1NQQU4+PFNQQU4gTEFORz0iZnIiPiA8Rk9OVCBGQUNFPSJDYWxpYnJpIj4yMjA1MjAxNDwvRk9OVD48L1NQQU4+PFMNCglQQU4gTEFORz0iZnIiPjwvU1BBTj48U1BBTiBMQU5HPSJmciI+Jm5ic3A7Jm5ic3A7Jm5ic3A7Jm5ic3A7Jm5ic3A7Jm4NCglic3A7Jm5ic3A7PC9TUEFOPjxTUEFOIExBTkc9ImZyIj4gPEZPTlQgRkFDRT0iQ2FsaWJyaSI+LTwvRk9OVD48L1NQQU4+PFMNCglQQU4gTEFORz0iZnIiPjwvU1BBTj48U1BBTiBMQU5HPSJmciI+Jm5ic3A7Jm5ic3A7Jm5ic3A7Jm5ic3A7Jm5ic3A7Jm4NCglic3A7PC9TUEFOPjxTUEFOIExBTkc9ImZyIj4gPEZPTlQgRkFDRT0iQ2FsaWJyaSI+MjAxNC0wNC0yMjwvRk9OVD48L1NQQU4+DQoJPFNQQU4gTEFORz0iZnIiPjwvU1BBTj48U1BBTiBMQU5HPSJmciI+Jm5ic3A7Jm5ic3A7Jm5ic3A7Jm5ic3A7Jm5ic3A7DQoJPC9TUEFOPjxTUEFOIExBTkc9ImZyIj4gPEZPTlQgRkFDRT0iQ2FsaWJyaSI+MTA6MDA8L0ZPTlQ+PC9TUEFOPjxTUEFOIExBTkcNCgk9ImZyIj48L1NQQU4+PFNQQU4gTEFORz0iZnIiPiZuYnNwOyZuYnNwOzwvU1BBTj48U1BBTiBMQU5HPSJmciI+IDxGT05UIEYNCglBQ0U9IkNhbGlicmkiPihHTVQrMDE6MDApIEJydXhlbGxlcywgQ29wZW5oYWd1ZSwgTWFkcmlkLCBQYXJpcyAoaGV1cmUgZA0KCSfDqXTDqSk8L0ZPTlQ+PC9TUEFOPjxTUEFOIExBTkc9ImZyIj48L1NQQU4+PFNQQU4gTEFORz0iZnIiPiZuYnNwOzwvU1BBTj4NCgk8U1BBTiBMQU5HPSJmciI+PC9TUEFOPjxTUEFOIExBTkc9ImZyIj48QlI+bjwvU1BBTj48U1BBTiBMQU5HPSJmciI+PC9TUEFODQoJPjxTUEFOIExBTkc9ImZyIj48L1NQQU4+PFNQQU4gTEFORz0iZnIiPjxCUj5uPEZPTlQgU0laRT0yIEZBQ0U9IkFyaWFsIj5Wbw0KCXVzIHBvdXZleiBmb3VybmlyIMOgIHZvcyBpbnZpdMOpcyBsZXMgbGllbnMgc3VpdmFudHMgcG91ciBsZXVyIHBlcm1ldHRyZSBkDQoJZSByZWpvaW5kcmUgbGEgY29uZsOpcmVuY2UgZmFjaWxlbWVudCBlbiBxdWVscXVlcyBjbGljcyA6IDwvRk9OVD48L1NQQU4+PC8NCglQPm5uPFAgRElSPUxUUj48U1BBTiBMQU5HPSJmciI+PEZPTlQgU0laRT0yIEZBQ0U9IlN5bWJvbCI+JiMxODM7PEZPTlQgRg0KCUFDRT0iQ291cmllciBOZXciPiZuYnNwOyZuYnNwOyZuYnNwOyZuYnNwOyZuYnNwOyZuYnNwOzwvRk9OVD48L0ZPTlQ+DQoJPC9TUEFOPjxTUEFOIExBTkc9ImZyIj48L1NQQU4+PFNQQU4gTEFORz0iZnIiPjwvU1BBTj48U1BBTiBMQU5HPSJmciI+IDxGT04NCglUIFNJWkU9MiBGQUNFPSJBcmlhbCI+ZGVwdWlzIElOVFJBTkVUIDo8L0ZPTlQ+PC9TUEFOPjxTUEFOIExBTkc9ImZyIj4gPC9TUA0KCUFOPjxBIEhSRUY9Imh0dHBzOi8vbW9uc2kuc3NvLmZyYW5jZXRlbGVjb20uZnIvaW5kZXguYXNwP3RhcmdldD1IVFRQJTNBJTJGDQoJJTJGY29vcG5ldC5zc28uZnJhbmNldGVsZWNvbS5mciUyRkRlZmF1bHQuYXNweCUzZlJldHVyblVybCUzZCUyNTJmRGlyZWN0QWMNCgljZXNzJTI1MmZTdGFydENvbmZlcmVuY2VCeVVybC5hc3B4JTI1M2ZjcElkJTI1M2RFMTNCQTYxNi1GRUVDLTRBNjAtQjYwNS02MQ0KCThGNTkyQjY5NDciPjxTUEFOIExBTkc9ImZyIj48L1NQQU4+PFNQQU4gTEFORz0iZnIiPjwvU1BBTj48U1BBTiBMQU5HPSJmciI+DQoJPFU+PEZPTlQgQ09MT1I9IiMwMDAwRkYiIFNJWkU9MiBGQUNFPSJBcmlhbCI+Y2xpcXVleiBpY2k8L0ZPTlQ+PC9VPjwvU1BBTj4NCgk8U1BBTiBMQU5HPSJmciI+PC9TUEFOPjwvQT48U1BBTiBMQU5HPSJmciI+PC9TUEFOPjxTUEFOIExBTkc9ImZyIj48L1NQQU4+PA0KCVNQQU4gTEFORz0iZnIiPjxGT05UIFNJWkU9MiBGQUNFPSJBcmlhbCI+IDwvRk9OVD48L1NQQU4+PC9QPm5uPFAgRElSPUxUUg0KCT48U1BBTiBMQU5HPSJmciI+PEZPTlQgU0laRT0yIEZBQ0U9IlN5bWJvbCI+JiMxODM7PEZPTlQgRkFDRT0iQ291cmllciBOZXcNCgkiPiZuYnNwOyZuYnNwOyZuYnNwOyZuYnNwOyZuYnNwOyZuYnNwOzwvRk9OVD48L0ZPTlQ+IDxGT05UIFNJWkU9MiBGQQ0KCUNFPSJBcmlhbCI+ZGVwdWlzIElOVEVSTkVUIDo8L0ZPTlQ+PC9TUEFOPjxTUEFOIExBTkc9ImZyIj4gPC9TUEFOPjxBIEhSRUY9DQoJImh0dHBzOi8vY29vcG5ldC5tdWx0aW1lZGlhLWNvbmZlcmVuY2Uub3JhbmdlLWJ1c2luZXNzLmNvbS9EaXJlY3RBY2Nlc3MvU3QNCglhcnRDb25mZXJlbmNlQnlVcmwuYXNweD9jcElkPUUxM0JBNjE2LUZFRUMtNEE2MC1CNjA1LTYxOEY1OTJCNjk0NyI+PFNQQU4gTA0KCUFORz0iZnIiPjwvU1BBTj48U1BBTiBMQU5HPSJmciI+PC9TUEFOPjxTUEFOIExBTkc9ImZyIj48VT48Rk9OVCBDT0xPUj0iIzAwDQoJMDBGRiIgU0laRT0yIEZBQ0U9IkFyaWFsIj5jbGlxdWV6IGljaTwvRk9OVD48L1U+PC9TUEFOPjxTUEFOIExBTkc9ImZyIj48L1MNCglQQU4+PC9BPjxTUEFOIExBTkc9ImZyIj48L1NQQU4+PFNQQU4gTEFORz0iZnIiPjwvU1BBTj48U1BBTiBMQU5HPSJmciI+PEZPTg0KCVQgU0laRT0yIEZBQ0U9IkFyaWFsIj4gPC9GT05UPjwvU1BBTj48L1A+bm48UCBESVI9TFRSPjxTUEFOIExBTkc9ImZyIj48Lw0KCVNQQU4+PFNQQU4gTEFORz0iZnIiPjwvU1BBTj48U1BBTiBMQU5HPSJmciI+PC9TUEFOPjwvUD5uPEJSPm5uPFAgRElSPUxUDQoJUj48U1BBTiBMQU5HPSJmciI+PEZPTlQgU0laRT0yIEZBQ0U9IlRyZWJ1Y2hldCBNUyI+UmUsPC9GT05UPjwvU1BBTj48L1A+DQoJbm48UCBESVI9TFRSPjxTUEFOIExBTkc9ImZyIj48Rk9OVCBTSVpFPTIgRkFDRT0iVHJlYnVjaGV0IE1TIj5MYSBzZWNvbmRlIA0KCXLDqXVuaW9uIGRlIERBTyBhdXJhIGJpZW4gbGlldSBsZSAyMi8wNCBldCBub24gbGUgMjIvMDUgY29tbWUgbWVudGlvbm7DqSBkDQoJYW5zIGxhIDE8L0ZPTlQ+PC9TUEFOPjxTUEFOIExBTkc9ImZyIj48L1NQQU4+PFNQQU4gTEFORz0iZnIiPjwvU1BBTj48U1BBTiANCglMQU5HPSJmciI+PFNVUD48Rk9OVCBTSVpFPTIgRkFDRT0iVHJlYnVjaGV0IE1TIj7DqHJlPC9GT05UPjwvU1VQPjwvU1BBTj48Uw0KCVBBTiBMQU5HPSJmciI+PC9TUEFOPjxTUEFOIExBTkc9ImZyIj48L1NQQU4+PFNQQU4gTEFORz0iZnIiPjxGT05UIFNJWkU9MiBGDQoJQUNFPSJUcmVidWNoZXQgTVMiPiBpbnZpdGF0aW9uwqA8L0ZPTlQ+PC9TUEFOPjxTUEFOIExBTkc9ImZyIj48L1NQQU4+PFNQQU4NCgkgTEFORz0iZnIiPjwvU1BBTj48U1BBTiBMQU5HPSJmciI+PEZPTlQgRkFDRT0iV2luZ2RpbmdzIiBTSVpFPTI+SjwvRk9OVD48Lw0KCVNQQU4+PFNQQU4gTEFORz0iZnIiPjwvU1BBTj48U1BBTiBMQU5HPSJmciI+PC9TUEFOPjxTUEFOIExBTkc9ImZyIj48L1NQQU4+DQoJPC9QPm5uPFAgRElSPUxUUj48U1BBTiBMQU5HPSJmciI+PEZPTlQgU0laRT0yIEZBQ0U9IlRyZWJ1Y2hldCBNUyI+QmllbiBjDQoJZHQsPC9GT05UPjwvU1BBTj48L1A+bm48UCBESVI9TFRSPjxTUEFOIExBTkc9ImZyIj48Rk9OVCBTSVpFPTIgRkFDRT0iVHINCgllYnVjaGV0IE1TIj5BdWRyZXk8L0ZPTlQ+PC9TUEFOPjxTUEFOIExBTkc9ImZyIj48L1NQQU4+PFNQQU4gTEFORz0iZnIiPjwvUw0KCVBBTj48U1BBTiBMQU5HPSJmciI+PC9TUEFOPjwvUD5ubjwvQk9EWT5uPC9IVE1MPg0KWC1NSUNST1NPRlQtQ0RPLUJVU1lTVEFUVVM6VEVOVEFUSVZFDQpYLU1JQ1JPU09GVC1DRE8tSU1QT1JUQU5DRToxDQpYLU1JQ1JPU09GVC1ESVNBTExPVy1DT1VOVEVSOkZBTFNFDQpYLU1TLU9MSy1BUFBUTEFTVFNFUVVFTkNFOjENClgtTVMtT0xLLUFQUFRTRVFUSU1FOjIwMTQwNDAzVDEzMjIzOFoNClgtTVMtT0xLLUNPTkZUWVBFOjANCkVORDpWRVZFTlQNCkJFR0lOOlZFVkVOVA0KQVRURU5ERUU7Q049IkZFTkFZUk9VIEFubmUgRXh0IE9GL0RTSUYiO1JTVlA9VFJVRTptYWlsdG86YWZlbmF5cm91LmV4dEBvcmFuDQoJZ2UuY29tDQpBVFRFTkRFRTtDTj0iTEFWQUJSRSBDbMOpbWVudCBPRi9EU0lGIjtSU1ZQPVRSVUU6bWFpbHRvOmNsZW1lbnQubGF2YWJyZUBvcmENCgluZ2UuY29tDQpBVFRFTkRFRTtDTj1jaHJpc3RvcGhlLmNvbWJldEBncmVlbi1jb25zZWlsLmNvbTtSU1ZQPVRSVUU6bWFpbHRvOmNocmlzdG9waGUNCgkuY29tYmV0QGdyZWVuLWNvbnNlaWwuY29tDQpBVFRFTkRFRTtDTj1vbGl2aWVyLnZhbnNvbkBncmVlbi1jb25zZWlsLmNvbTtSU1ZQPVRSVUU6bWFpbHRvOm9saXZpZXIudmFuc28NCgluQGdyZWVuLWNvbnNlaWwuY29tDQpBVFRFTkRFRTtDTj1nZW9yZ2VzLnJvY2NvQGdyZWVuLWNvbnNlaWwuY29tO1JTVlA9VFJVRTptYWlsdG86Z2Vvcmdlcy5yb2Njb0ANCglncmVlbi1jb25zZWlsLmNvbQ0KQ0xBU1M6UFVCTElDDQpDUkVBVEVEOjIwMTQwNDE2VDA5MDMwNloNCkRFU0NSSVBUSU9OOkJvbmpvdXIsIG5uQWxleGlzIGV0IG1vaS1tw6ptZSB2b3VzIHByb3Bvc29ucyBjZSBjcsOpbmVhdSBwbw0KCXVyIHBhcmNvdXJpciBlbnNlbWJsZSBsZSBzY29wZSBkdSB0ZW1wcyBkJ2FuaW1hdGlvbiBkdSAyMiBtYWkgcG91ciBsJ3VuaXZlDQoJcnMgc29zaCBtb2JpbGUgZXQgc29zaCBtb2JpbGUrbGl2ZWJveCwgdHJhbnNtaXMgY2Ugam91ci5ubk4uQiA6IGxlIGRvY3UNCgltZW50IHNlIHRyb3V2ZSBpY2kgOiBodHRwOi8vc2hwLml0bi5mdGdyb3VwL3NpdGVzL0xPTW9iaWxlT25saW5lLzIwMTQlMjAlMg0KCTBzYWlzb24lMjAyL3VuaXZlcnMlMjBzb3NoL1Njb3BlX1NhaXNvbl9EQ09MX1VuaXZlcnNfU29zaF9TYWlzb24yX1RBMl8yMm1hDQoJaTIwMTRfdjAuMi5wcHR4IG5uTm91cyBmZXJvbnMgY2VsYSBwYXIgdMOpbMOpcGhvbmUgZXQgdmlhIGNvb3BuZXQgOm5Ob20NCgkJTW90IGRlIHBhc3NlCU7CsCBkZSBwb250CURhdGUgKEFBQUEtTU0tSkopCUhldXJlIGRlIGTDqWJ1dAlGdXNlYXV4IGhvcmFpcg0KCWUJblRBMjJtYWkyMDE0CXVuaXZlcnNzb3NoCSszMyAxIDU4IDcyIDYyIDM3CTIwMTQtMDQtMTcJMTY6MDAJKEdNVCswMTowMCkNCgkgQnJ1eGVsbGVzLCBDb3BlbmhhZ3VlLCBNYWRyaWQsIFBhcmlzIChoZXVyZSBkJ8OpdMOpKQlublZvdXMgcG91dmV6IGYNCglvdXJuaXIgw6Agdm9zIGludml0w6lzIGxlcyBsaWVucyBzdWl2YW50cyBwb3VyIGxldXIgcGVybWV0dHJlIGRlIHJlam9pbmRyZQ0KCSBsYSBjb25mw6lyZW5jZSBmYWNpbGVtZW50IGVuIHF1ZWxxdWVzIGNsaWNzIDogbioJZGVwdWlzIElOVFJBTkVUIDogY2xpcXUNCglleiBpY2kgPGh0dHBzOi8vbW9uc2kuc3NvLmZyYW5jZXRlbGVjb20uZnIvaW5kZXguYXNwP3RhcmdldD1IVFRQJTNBJTJGJTJGYw0KCW9vcG5ldC5zc28uZnJhbmNldGVsZWNvbS5mciUyRkRlZmF1bHQuYXNweCUzZlJldHVyblVybCUzZCUyNTJmRGlyZWN0QWNjZXNzDQoJJTI1MmZTdGFydENvbmZlcmVuY2VCeVVybC5hc3B4JTI1M2ZjcElkJTI1M2RBNTEwOTEzOC0yMEYzLTRCMTYtODc3Qy1BNTg2NDANCgkzMzZCOTY+ICBuKglkZXB1aXMgSU5URVJORVQgOiBjbGlxdWV6IGljaSA8aHR0cHM6Ly9jb29wbmV0Lm11bHRpbWVkaWEtY29uDQoJZmVyZW5jZS5vcmFuZ2UtYnVzaW5lc3MuY29tL0RpcmVjdEFjY2Vzcy9TdGFydENvbmZlcmVuY2VCeVVybC5hc3B4P2NwSWQ9QTUNCgkxMDkxMzgtMjBGMy00QjE2LTg3N0MtQTU4NjQwMzM2Qjk2PiAgbm5Db3JkaWFsZW1lbnQsIG5BbGV4aXMgZXQgRGF2aWQNCglublVuZSBwZW5zw6llIMOpY29sbyA6ICBuJ2ltcHJpbWV6IHF1ZSBzaSBuw6ljZXNzYWlyZSwgc3ZwLiBubm5uDQpEVEVORDtUWklEPSJSb21hbmNlIFN0YW5kYXJkIFRpbWUiOjIwMTQwNDE3VDE3MDAwMA0KRFRTVEFNUDoyMDE0MDQxNlQwOTAyNTVaDQpEVFNUQVJUO1RaSUQ9IlJvbWFuY2UgU3RhbmRhcmQgVGltZSI6MjAxNDA0MTdUMTYwMDAwDQpMQVNULU1PRElGSUVEOjIwMTQwNDI1VDIxMTk1MVoNCkxPQ0FUSU9OOjAxIDU4IDcyIDYyIDM3ICsgY29vcG5ldA0KT1JHQU5JWkVSO0NOPSJNQVRISUVVIERhdmlkIE9GL0RSQ0dQIjptYWlsdG86ZGF2aWQubWF0aGlldUBvcmFuZ2UuY29tDQpQUklPUklUWTo1DQpTRVFVRU5DRTowDQpTVU1NQVJZO0xBTkdVQUdFPWZyOltUQSAyMiBtYWkgMjAxNF0gc2NvcGUgc29zaCBtb2JpbGUgZXQgc29zaCBtb2JpbGUrbGl2ZWINCglveA0KVFJBTlNQOk9QQVFVRQ0KVUlEOjA0MDAwMDAwODIwMEUwMDA3NEM1QjcxMDFBODJFMDA4MDAwMDAwMDAzMERGMENCM0Q0NThDRjAxMDAwMDAwMDAwMDAwMDAwDQoJMDEwMDAwMDAwOUY4NEM3NjdENEEyOEE0NzlFQ0E0RDAxMjE4OTJDMDENClgtQUxULURFU0M7Rk1UVFlQRT10ZXh0L2h0bWw6PCFET0NUWVBFIEhUTUwgUFVCTElDICItLy9XM0MvL0RURCBIVE1MIDMuMi8vRQ0KCU4iPm48SFRNTD5uPEhFQUQ+bjxNRVRBIE5BTUU9IkdlbmVyYXRvciIgQ09OVEVOVD0iTVMgRXhjaGFuZ2UgU2VydmVyIHZlDQoJcnNpb24gMTQuMDIuNTAwNC4wMDAiPm48VElUTEU+PC9USVRMRT5uPC9IRUFEPm48Qk9EWT5uPCEtLSBDb252ZXJ0ZWQgZg0KCXJvbSB0ZXh0L3J0ZiBmb3JtYXQgLS0+bm48UCBESVI9TFRSPjxTUEFOIExBTkc9ImZyIj48Rk9OVCBGQUNFPSJDYWxpYnJpIg0KCT5Cb25qb3VyLCA8L0ZPTlQ+PC9TUEFOPjwvUD5ubjxQIERJUj1MVFI+PFNQQU4gTEFORz0iZnIiPjxGT05UIEZBQ0U9IkNhDQoJbGlicmkiPkFsZXhpcyBldCBtb2ktbcOqbWUgdm91cyBwcm9wb3NvbnM8L0ZPTlQ+PC9TUEFOPjxTUEFOIExBTkc9ImZyIj48Rk8NCglOVCBGQUNFPSJDYWxpYnJpIj4gY2UgY3LDqW5lYXUgcG91ciBwYXJjb3VyaXIgZW5zZW1ibGUgbGUgc2NvcGUgZHUgdGVtcHMgZA0KCSdhbmltYXRpb24gZHUgMjIgbWFpIHBvdXIgbCd1bml2ZXJzPC9GT05UPjwvU1BBTj48U1BBTiBMQU5HPSJmciI+IDxGT05UIEZBDQoJQ0U9IkNhbGlicmkiPnNvc2ggbW9iaWxlIGV0IHNvc2ggbW9iaWxlK2xpdmVib3gsPC9GT05UPjwvU1BBTj48U1BBTiBMQU5HPQ0KCSJmciI+PEZPTlQgRkFDRT0iQ2FsaWJyaSI+IHRyYW5zbWlzIGNlIGpvdXIuPC9GT05UPjwvU1BBTj48L1A+bm48UCBESVI9TA0KCVRSPjxTUEFOIExBTkc9ImZyIj48Rk9OVCBGQUNFPSJDYWxpYnJpIj5OLkIgOiBsZSBkb2N1bWVudCBzZSB0cm91dmUgaWNpIDo8DQoJL0ZPTlQ+PC9TUEFOPjxTUEFOIExBTkc9ImZyIj4gPC9TUEFOPjxBIEhSRUY9Imh0dHA6Ly9zaHAuaXRuLmZ0Z3JvdXAvc2l0ZXMNCgkvTE9Nb2JpbGVPbmxpbmUvMjAxNCUyMCUyMHNhaXNvbiUyMDIvdW5pdmVycyUyMHNvc2gvU2NvcGVfU2Fpc29uX0RDT0xfVW5pdg0KCWVyc19Tb3NoX1NhaXNvbjJfVEEyXzIybWFpMjAxNF92MC4yLnBwdHgiPjxTUEFOIExBTkc9ImZyIj48VT48Rk9OVCBDT0xPUj0iDQoJIzAwMDBGRiIgRkFDRT0iQ2FsaWJyaSI+aHR0cDovL3NocC5pdG4uZnRncm91cC9zaXRlcy9MT01vYmlsZU9ubGluZS8yMDE0JTINCgkwJTIwc2Fpc29uJTIwMi91bml2ZXJzJTIwc29zaC9TY29wZV9TYWlzb25fRENPTF9Vbml2ZXJzX1Nvc2hfU2Fpc29uMl9UQTJfMg0KCTJtYWkyMDE0X3YwLjIucHB0eDwvRk9OVD48L1U+PC9TUEFOPjxTUEFOIExBTkc9ImZyIj48L1NQQU4+PC9BPjxTUEFOIExBTkc9DQoJImZyIj48Rk9OVCBGQUNFPSJDYWxpYnJpIj48L0ZPTlQ+PC9TUEFOPjxTUEFOIExBTkc9ImZyIj4gPC9TUEFOPjwvUD5ubjxQDQoJIERJUj1MVFI+PFNQQU4gTEFORz0iZnIiPjxGT05UIEZBQ0U9IkNhbGlicmkiPk5vdXMgZmVyb25zIGNlbGEgcGFyIHTDqWzDqXANCglob25lIGV0IHZpYSBjb29wbmV0IDo8L0ZPTlQ+PC9TUEFOPjwvUD5ubjxQIERJUj1MVFIgQUxJR049Q0VOVEVSPjxTUEFOIEwNCglBTkc9ImZyIj48Qj48Rk9OVCBGQUNFPSJDYWxpYnJpIj5Ob208L0ZPTlQ+PC9CPjwvU1BBTj48U1BBTiBMQU5HPSJmciI+PEI+PA0KCS9CPjwvU1BBTj48U1BBTiBMQU5HPSJmciI+PEI+Jm5ic3A7Jm5ic3A7Jm5ic3A7Jm5ic3A7PC9CPjwvU1BBTj48U1BBTiANCglMQU5HPSJmciI+PEI+IDxGT05UIEZBQ0U9IkNhbGlicmkiPk1vdCBkZSBwYXNzZTwvRk9OVD48L0I+PC9TUEFOPjxTUEFOIExBTg0KCUc9ImZyIj48Qj48L0I+PC9TUEFOPjxTUEFOIExBTkc9ImZyIj48Qj4mbmJzcDsmbmJzcDsmbmJzcDs8L0I+PC9TUEFOPjxTDQoJUEFOIExBTkc9ImZyIj48Qj4gPEZPTlQgRkFDRT0iQ2FsaWJyaSI+TsKwIGRlIHBvbnQ8L0ZPTlQ+PC9CPjwvU1BBTj48U1BBTiANCglMQU5HPSJmciI+PEI+PC9CPjwvU1BBTj48U1BBTiBMQU5HPSJmciI+PEI+Jm5ic3A7Jm5ic3A7Jm5ic3A7Jm5ic3A7Jm5iDQoJc3A7PC9CPjwvU1BBTj48U1BBTiBMQU5HPSJmciI+PEI+IDxGT05UIEZBQ0U9IkNhbGlicmkiPkRhdGUgKEFBQUEtTU0tSkopPA0KCS9GT05UPjwvQj48L1NQQU4+PFNQQU4gTEFORz0iZnIiPjxCPjwvQj48L1NQQU4+PFNQQU4gTEFORz0iZnIiPjxCPiZuYnNwOyYNCgluYnNwOyZuYnNwOyZuYnNwOyZuYnNwOyZuYnNwOzwvQj48L1NQQU4+PFNQQU4gTEFORz0iZnIiPjxCPiA8Rk9OVCBGQUMNCglFPSJDYWxpYnJpIj5IZXVyZSBkZSBkw6lidXQ8L0ZPTlQ+PC9CPjwvU1BBTj48U1BBTiBMQU5HPSJmciI+PEI+PC9CPjwvU1BBTg0KCT48U1BBTiBMQU5HPSJmciI+PEI+Jm5ic3A7PC9CPjwvU1BBTj48U1BBTiBMQU5HPSJmciI+PEI+IDxGT05UIEZBQ0U9IkNhbGkNCglicmkiPkZ1c2VhdXggaG9yYWlyZTwvRk9OVD48L0I+PC9TUEFOPjxTUEFOIExBTkc9ImZyIj48Qj48L0I+PC9TUEFOPjxTUEFOIA0KCUxBTkc9ImZyIj48Qj48L0I+PC9TUEFOPjxTUEFOIExBTkc9ImZyIj48L1NQQU4+PFNQQU4gTEFORz0iZnIiPjxCUj5uPC9TUEENCglOPjxTUEFOIExBTkc9ImZyIj48Rk9OVCBGQUNFPSJDYWxpYnJpIj5UQTIybWFpMjAxNDwvRk9OVD48L1NQQU4+PFNQQU4gTEFORw0KCT0iZnIiPjwvU1BBTj48U1BBTiBMQU5HPSJmciI+Jm5ic3A7Jm5ic3A7Jm5ic3A7Jm5ic3A7PC9TUEFOPjxTUEFOIExBTkcNCgk9ImZyIj4gPEZPTlQgRkFDRT0iQ2FsaWJyaSI+dW5pdmVyc3Nvc2g8L0ZPTlQ+PC9TUEFOPjxTUEFOIExBTkc9ImZyIj48L1NQQQ0KCU4+PFNQQU4gTEFORz0iZnIiPiZuYnNwOyZuYnNwOyZuYnNwOyZuYnNwOzwvU1BBTj48U1BBTiBMQU5HPSJmciI+IDxGT04NCglUIEZBQ0U9IkNhbGlicmkiPiszMyAxIDU4IDcyIDYyIDM3PC9GT05UPjwvU1BBTj48U1BBTiBMQU5HPSJmciI+PC9TUEFOPjxTUA0KCUFOIExBTkc9ImZyIj4mbmJzcDsmbmJzcDsmbmJzcDsmbmJzcDsmbmJzcDsmbmJzcDs8L1NQQU4+PFNQQU4gTEFORz0iDQoJZnIiPiA8Rk9OVCBGQUNFPSJDYWxpYnJpIj4yMDE0LTA0LTE3PC9GT05UPjwvU1BBTj48U1BBTiBMQU5HPSJmciI+PC9TUEFOPjwNCglTUEFOIExBTkc9ImZyIj4mbmJzcDsmbmJzcDsmbmJzcDsmbmJzcDsmbmJzcDs8L1NQQU4+PFNQQU4gTEFORz0iZnIiPiANCgk8Rk9OVCBGQUNFPSJDYWxpYnJpIj4xNjowMDwvRk9OVD48L1NQQU4+PFNQQU4gTEFORz0iZnIiPjwvU1BBTj48U1BBTiBMQU5HPQ0KCSJmciI+Jm5ic3A7Jm5ic3A7PC9TUEFOPjxTUEFOIExBTkc9ImZyIj4gPEZPTlQgRkFDRT0iQ2FsaWJyaSI+KEdNVCswMTowMA0KCSkgQnJ1eGVsbGVzLCBDb3BlbmhhZ3VlLCBNYWRyaWQsIFBhcmlzIChoZXVyZSBkJ8OpdMOpKTwvRk9OVD48L1NQQU4+PFNQDQoJQU4gTEFORz0iZnIiPjwvU1BBTj48U1BBTiBMQU5HPSJmciI+Jm5ic3A7PC9TUEFOPjxTUEFOIExBTkc9ImZyIj48L1NQQU4+PA0KCVNQQU4gTEFORz0iZnIiPjxCUj5uPC9TUEFOPjxTUEFOIExBTkc9ImZyIj48L1NQQU4+PFNQQU4gTEFORz0iZnIiPjwvU1BBTj4NCgk8U1BBTiBMQU5HPSJmciI+PEJSPm48Rk9OVCBTSVpFPTIgRkFDRT0iQXJpYWwiPlZvdXMgcG91dmV6IGZvdXJuaXIgw6Agdm9zDQoJIGludml0w6lzIGxlcyBsaWVucyBzdWl2YW50cyBwb3VyIGxldXIgcGVybWV0dHJlIGRlIHJlam9pbmRyZSBsYSBjb25mw6lyZW4NCgljZSBmYWNpbGVtZW50IGVuIHF1ZWxxdWVzIGNsaWNzIDogPC9GT05UPjwvU1BBTj48L1A+bm48UCBESVI9TFRSPjxTUEFOIEwNCglBTkc9ImZyIj48Rk9OVCBTSVpFPTIgRkFDRT0iU3ltYm9sIj4mIzE4Mzs8Rk9OVCBGQUNFPSJDb3VyaWVyIE5ldyI+Jm5ic3ANCgk7Jm5ic3A7Jm5ic3A7Jm5ic3A7Jm5ic3A7Jm5ic3A7PC9GT05UPjwvRk9OVD48L1NQQU4+PFNQQU4gTEFORz0iZnIiPjwNCgkvU1BBTj48U1BBTiBMQU5HPSJmciI+PC9TUEFOPjxTUEFOIExBTkc9ImZyIj4gPEZPTlQgU0laRT0yIEZBQ0U9IkFyaWFsIj5kZQ0KCXB1aXMgSU5UUkFORVQgOjwvRk9OVD48L1NQQU4+PFNQQU4gTEFORz0iZnIiPiA8L1NQQU4+PEEgSFJFRj0iaHR0cHM6Ly9tb25zDQoJaS5zc28uZnJhbmNldGVsZWNvbS5mci9pbmRleC5hc3A/dGFyZ2V0PUhUVFAlM0ElMkYlMkZjb29wbmV0LnNzby5mcmFuY2V0ZWwNCgllY29tLmZyJTJGRGVmYXVsdC5hc3B4JTNmUmV0dXJuVXJsJTNkJTI1MmZEaXJlY3RBY2Nlc3MlMjUyZlN0YXJ0Q29uZmVyZW5jZQ0KCUJ5VXJsLmFzcHglMjUzZmNwSWQlMjUzZEE1MTA5MTM4LTIwRjMtNEIxNi04NzdDLUE1ODY0MDMzNkI5NiI+PFNQQU4gTEFORz0iDQoJZnIiPjwvU1BBTj48U1BBTiBMQU5HPSJmciI+PC9TUEFOPjxTUEFOIExBTkc9ImZyIj48VT48Rk9OVCBDT0xPUj0iIzAwMDBGRiINCgkgU0laRT0yIEZBQ0U9IkFyaWFsIj5jbGlxdWV6IGljaTwvRk9OVD48L1U+PC9TUEFOPjxTUEFOIExBTkc9ImZyIj48L1NQQU4+PA0KCS9BPjxTUEFOIExBTkc9ImZyIj48L1NQQU4+PFNQQU4gTEFORz0iZnIiPjwvU1BBTj48U1BBTiBMQU5HPSJmciI+PEZPTlQgU0laDQoJRT0yIEZBQ0U9IkFyaWFsIj4gPC9GT05UPjwvU1BBTj48L1A+bm48UCBESVI9TFRSPjxTUEFOIExBTkc9ImZyIj48Rk9OVCBTDQoJSVpFPTIgRkFDRT0iU3ltYm9sIj4mIzE4Mzs8Rk9OVCBGQUNFPSJDb3VyaWVyIE5ldyI+Jm5ic3A7Jm5ic3A7Jm5ic3A7Jg0KCW5ic3A7Jm5ic3A7Jm5ic3A7PC9GT05UPjwvRk9OVD4gPEZPTlQgU0laRT0yIEZBQ0U9IkFyaWFsIj5kZXB1aXMgSU5URVJODQoJRVQgOjwvRk9OVD48L1NQQU4+PFNQQU4gTEFORz0iZnIiPiA8L1NQQU4+PEEgSFJFRj0iaHR0cHM6Ly9jb29wbmV0Lm11bHRpbWUNCglkaWEtY29uZmVyZW5jZS5vcmFuZ2UtYnVzaW5lc3MuY29tL0RpcmVjdEFjY2Vzcy9TdGFydENvbmZlcmVuY2VCeVVybC5hc3B4Pw0KCWNwSWQ9QTUxMDkxMzgtMjBGMy00QjE2LTg3N0MtQTU4NjQwMzM2Qjk2Ij48U1BBTiBMQU5HPSJmciI+PC9TUEFOPjxTUEFOIExBDQoJTkc9ImZyIj48L1NQQU4+PFNQQU4gTEFORz0iZnIiPjxVPjxGT05UIENPTE9SPSIjMDAwMEZGIiBTSVpFPTIgRkFDRT0iQXJpYWwNCgkiPmNsaXF1ZXogaWNpPC9GT05UPjwvVT48L1NQQU4+PFNQQU4gTEFORz0iZnIiPjwvU1BBTj48L0E+PFNQQU4gTEFORz0iZnIiPg0KCTwvU1BBTj48U1BBTiBMQU5HPSJmciI+PC9TUEFOPjxTUEFOIExBTkc9ImZyIj48Rk9OVCBTSVpFPTIgRkFDRT0iQXJpYWwiPiA8DQoJL0ZPTlQ+PC9TUEFOPjwvUD5ubjxQIERJUj1MVFI+PFNQQU4gTEFORz0iZnIiPjwvU1BBTj48L1A+bm48UCBESVI9TFRSPg0KCTxTUEFOIExBTkc9ImZyIj48L1NQQU4+PFNQQU4gTEFORz0iZnIiPjwvU1BBTj48U1BBTiBMQU5HPSJmci1mciI+PEZPTlQgU0laDQoJRT0yIEZBQ0U9IkNhbGlicmkiPkNvcmRpYWxlbWVudCw8L0ZPTlQ+PC9TUEFOPjxTUEFOIExBTkc9ImZyIj48L1NQQU4+PFNQQQ0KCU4gTEFORz0iZnItZnIiPiA8L1NQQU4+PC9QPm5uPFAgRElSPUxUUj48U1BBTiBMQU5HPSJmciI+PC9TUEFOPjxTUEFOIExBTg0KCUc9ImZyIj48L1NQQU4+PFNQQU4gTEFORz0iZnItZnIiPjxGT05UIFNJWkU9MiBGQUNFPSJDYWxpYnJpIj5BbGV4aXMgZXQ8L0ZPDQoJTlQ+PC9TUEFOPjxTUEFOIExBTkc9ImZyIj48L1NQQU4+PFNQQU4gTEFORz0iZnIiPjwvU1BBTj48U1BBTiBMQU5HPSJmci1mciINCgk+IDxGT05UIFNJWkU9MiBGQUNFPSJDYWxpYnJpIj5EYXZpZDwvRk9OVD48L1NQQU4+PFNQQU4gTEFORz0iZnIiPjwvU1BBTj48Uw0KCVBBTiBMQU5HPSJmci1mciI+PC9TUEFOPjwvUD5ubjxQIERJUj1MVFI+PFNQQU4gTEFORz0iZnIiPjwvU1BBTj48U1BBTiBMQQ0KCU5HPSJmciI+PC9TUEFOPjxTUEFOIExBTkc9ImZyLWZyIj48L1NQQU4+PC9QPm5uPFAgRElSPUxUUj48U1BBTiBMQU5HPSJmcg0KCS1mciI+PEZPTlQgQ09MT1I9IiMwMDgwMDAiIFNJWkU9MiBGQUNFPSJDYWxpYnJpIj5VbmUgcGVuc8OpZSDDqWNvbG8gOiZuYnNwDQoJOyBuJ2ltcHJpbWV6IHF1ZSBzaSBuw6ljZXNzYWlyZSwgc3ZwLiA8L0ZPTlQ+PC9TUEFOPjwvUD5ubjxQIERJUj1MVFI+PA0KCVNQQU4gTEFORz0iZnIiPjwvU1BBTj48L1A+bm48UCBESVI9TFRSPjxTUEFOIExBTkc9ImZyIj48L1NQQU4+PC9QPm5uPC8NCglCT0RZPm48L0hUTUw+DQpYLU1JQ1JPU09GVC1DRE8tQlVTWVNUQVRVUzpURU5UQVRJVkUNClgtTUlDUk9TT0ZULUNETy1JTVBPUlRBTkNFOjENClgtTUlDUk9TT0ZULURJU0FMTE9XLUNPVU5URVI6RkFMU0UNClgtTVMtT0xLLUFQUFRMQVNUU0VRVUVOQ0U6MA0KWC1NUy1PTEstQVVUT1NUQVJUQ0hFQ0s6RkFMU0UNClgtTVMtT0xLLUNPTkZUWVBFOjANClgtTVMtT0xLLVNFTkRFUjtDTj0iWlpaIE1PQSI6bWFpbHRvOnNlbGZjYXJlLmxvQG9yYW5nZS5jb20NCkVORDpWRVZFTlQNCkJFR0lOOlZFVkVOVA0KQVRURU5ERUU7Q049IkZFTkFZUk9VIEFubmUgRXh0IE9GL0RTSUYiO1JTVlA9VFJVRTptYWlsdG86YWZlbmF5cm91LmV4dEBvcmFuDQoJZ2UuY29tDQpBVFRFTkRFRTtDTj0iTEFWQUJSRSBDbMOpbWVudCBPRi9EU0lGIjtSU1ZQPVRSVUU6bWFpbHRvOmNsZW1lbnQubGF2YWJyZUBvcmENCgluZ2UuY29tDQpBVFRFTkRFRTtDTj1jaHJpc3RvcGhlLmNvbWJldEBncmVlbi1jb25zZWlsLmNvbTtSU1ZQPVRSVUU6bWFpbHRvOmNocmlzdG9waGUNCgkuY29tYmV0QGdyZWVuLWNvbnNlaWwuY29tDQpBVFRFTkRFRTtDTj1vbGl2aWVyLnZhbnNvbkBncmVlbi1jb25zZWlsLmNvbTtSU1ZQPVRSVUU6bWFpbHRvOm9saXZpZXIudmFuc28NCgluQGdyZWVuLWNvbnNlaWwuY29tDQpBVFRFTkRFRTtDTj1nZW9yZ2VzLnJvY2NvQGdyZWVuLWNvbnNlaWwuY29tO1JTVlA9VFJVRTptYWlsdG86Z2Vvcmdlcy5yb2Njb0ANCglncmVlbi1jb25zZWlsLmNvbQ0KQ0xBU1M6UFVCTElDDQpDUkVBVEVEOjIwMTQwNDE3VDE0MDA0NFoNCkRFU0NSSVBUSU9OOlF1YW5kIDogbHVuZGkgMjggYXZyaWwgMjAxNCAxMDowMC0xMTowMCAoVVRDKzAxOjAwKSBCcnV4ZWxsZXMsDQoJIENvcGVuaGFndWUsIE1hZHJpZCwgUGFyaXMubkVtcGxhY2VtZW50IDogw6AgZMOpZmluaXJublJlbWFycXVlIDogbGUgDQoJZMOpY2FsYWdlIEdNVCBjaS1kZXNzdXMgbmUgdGllbnQgcGFzIGNvbXB0ZSBkZXMgcsOpZ2xhZ2VzIGRlIGwnaGV1cmUgZCfDqXQNCgnDqS5ubip+Kn4qfip+Kn4qfip+Kn4qfipubkJvbmpvdXIsbm5NZXJjaSDDoCB0b3VzIGRlIHZvdXMgcmVuZHJlIGRpDQoJc3BvbmlibGUgc3VyIGNlIGNyw6luZWF1IHBvdXIgcXVlIG5vdXMgcHVpc3Npb25zIGVuc2VtYmxlIHZhbGlkZXIgbGVzIMOpbA0KCcOpbWVudHMgZHUgYnJpZWYgcG91ciBsZSBUQSBkdSAyMi8wNS5ubkNkbHQsbm5MdXhpc2xlIFNpZXdlIFRvbGFuQ2hlDQoJZiBkZSBQcm9qZXQgV2Vibk9yYW5nZSA8aHR0cDovL29uZS1kaXJlY3Rvcnkuc3NvLmZyYW5jZXRlbGVjb20uZnIvYW5udWFpcg0KCWUvZW50aXRlLmRvP2FjdGlvbj1WaWV3JnVpZD0lMjMlMDAlN0UlMEYlMDREJTBBJTA3cSUxMC0lMUQlMTklMUMlMEMlMTclM0ZZDQoJJTI3JTBBTSUwMSUwQiUwNiUzRSUxNC0lMDclMDUlMDklMEMlMDAlMjlZJTI3JTBBTSUwRSUxNyUxMyUyMiUxNiUyNiUxRCUxNSUNCgkwNCUwMCUxMSUyMyUxOG8lMEQlMTNVJTAzJTAwPiAvIE9GIDxodHRwOi8vb25lLWRpcmVjdG9yeS5zc28uZnJhbmNldGVsZWNvbQ0KCS5mci9hbm51YWlyZS9lbnRpdGUuZG8/YWN0aW9uPVZpZXcmdWlkPSUyMyUwMCU3RSUwNiUxNkQlMEElMDdxJTEzN0UlMUYlMURYDQoJJTE3JTIyJTAxKiUxRCUxOSUwRCUxNiU1RSUyOCUxNiU3RSUwMCUxRSUxQyUxNyUxMyUyMiUxQjYlMDglMTklMUElMDAlNUUlMjgNCgklMTYlN0UlMEYlMDIlMDklMEIlMTElMjklMDElMjYlMDUlMTUlMEIlMEElMUYlNjAlMTErVCUxNiUxQT4gLyBEUkNHUCA8aHR0cA0KCTovL29uZS1kaXJlY3Rvcnkuc3NvLmZyYW5jZXRlbGVjb20uZnIvYW5udWFpcmUvZW50aXRlLmRvP2FjdGlvbj1WaWV3JnVpZD0lDQoJMjMlMDAlN0UlMEQlMDIlMEIlMDIlMDIlNjAlMUE2VCUxRiUwRUklMUQ5SCUyNSUxRCU1QyUwNyUxME8lMjklMUI3JTAwJTA0JTANCgkxJTAwJTAxJTYwJTExK1QlMTklMDYlMTElMDAtJTFCLSUxQyUxMSUwMSUxNyUxNyU2MCUxMStUJTE2JTFBJTA0JTFDJTJGJTEwNw0KCSUwQyUxQyUwRCUwNiUxRCUyMVklMjclMEFNJTBFJTE3PiAvIERDT0wgPGh0dHA6Ly9vbmUtZGlyZWN0b3J5LnNzby5mcmFuY2V0DQoJZWxlY29tLmZyL2FubnVhaXJlL2VudGl0ZS5kbz9hY3Rpb249VmlldyZ1aWQ9JTIzJTAwJTdFJTBEJTEzJTA3JTA5JTVFJTIzJTANCgkwJTdFJTBEJTAyJTBCJTAyJTAyJTYwJTFBNlQlMUYlMEVJJTFEOUglMjUlMUQlNUMlMDclMTBPJTI5JTFCNyUwMCUwNCUwMSUwMA0KCSUwMSU2MCUxMStUJTE5JTA2JTExJTAwLSUxQi0lMUMlMTElMDElMTclMTclNjAlMTErVCUxNiUxQSUwNCUxQyUyRiUxMDclMEMlDQoJMUMlMEQlMDYlMUQlMjFZJTI3JTBBTSUwRSUxNz4gLyBTRUxGQ0FSRSA8aHR0cDovL29uZS1kaXJlY3Rvcnkuc3NvLmZyYW5jZXQNCgllbGVjb20uZnIvYW5udWFpcmUvZW50aXRlLmRvP2FjdGlvbj1WaWV3JnVpZD0lMjMlMDAlN0UlMUElMTUlMDQlMDMlMTEtJTA3JQ0KCTI2RSUxRiUxRFglMTYlMkYlMUElMkZFJTFGJTFEWCUxNiUzRSUxNiUyNCUxOSU1QyUwNyUxME8lMjMlMTNvJTA2JTA1VSUwMyUwDQoJNiU2MCUxQTZUJTE1JTA2JTExJTFCOCUxQyUyNiUxQSU1QyUwQyUwNk8lMjUlMUI3JTFCJTExJTA2JTBCJTA3LSUxQzElMEMlNUMNCgklMEMlMDZPKiUwNyUyMiUwNyUxMyUwRCUxMSUxNyslMTArJTA2JTFERCUwMSUxMXElMTMxPiAgbjAxIDU3IDM2IDAxIDcwbjANCgk3IDg5IDUxIDgxIDYxbmx1eGlzbGUuc2lld2V0b2xhQG9yYW5nZS5jb21ubm5ubm4NCkRURU5EO1RaSUQ9IlJvbWFuY2UgU3RhbmRhcmQgVGltZSI6MjAxNDA0MjhUMTEwMDAwDQpEVFNUQU1QOjIwMTQwNDE3VDE0MDA0MFoNCkRUU1RBUlQ7VFpJRD0iUm9tYW5jZSBTdGFuZGFyZCBUaW1lIjoyMDE0MDQyOFQxMDAwMDANCkxBU1QtTU9ESUZJRUQ6MjAxNDA0MTdUMTQwMDQ0Wg0KTE9DQVRJT046w6AgZMOpZmluaXINCk9SR0FOSVpFUjtDTj0iU0lFV0UgVE9MQSBMdXhpc2xlIE9GL0RSQ0dQIjptYWlsdG86bHV4aXNsZS5zaWV3ZXRvbGFAb3JhbmdlLg0KCWNvbQ0KUFJJT1JJVFk6NQ0KU0VRVUVOQ0U6MA0KU1VNTUFSWTtMQU5HVUFHRT1mcjpWYWxpZGF0aW9uIGR1IGJyaWVmIFRBIGR1IDIyIG1haQ0KVFJBTlNQOk9QQVFVRQ0KVUlEOjA0MDAwMDAwODIwMEUwMDA3NEM1QjcxMDFBODJFMDA4MDAwMDAwMDAzMDM0REQwQTU2NUFDRjAxMDAwMDAwMDAwMDAwMDAwDQoJMDEwMDAwMDAwREQ5NjUwRDlFRDAwQTI0N0I3QTVDMUQ4NDY2REQxNEYNClgtQUxULURFU0M7Rk1UVFlQRT10ZXh0L2h0bWw6PCFET0NUWVBFIEhUTUwgUFVCTElDICItLy9XM0MvL0RURCBIVE1MIDMuMi8vRQ0KCU4iPm48SFRNTD5uPEhFQUQ+bjxNRVRBIE5BTUU9IkdlbmVyYXRvciIgQ09OVEVOVD0iTVMgRXhjaGFuZ2UgU2VydmVyIHZlDQoJcnNpb24gMTQuMDIuNTAwNC4wMDAiPm48VElUTEU+PC9USVRMRT5uPC9IRUFEPm48Qk9EWT5uPCEtLSBDb252ZXJ0ZWQgZg0KCXJvbSB0ZXh0L3J0ZiBmb3JtYXQgLS0+bm48UCBESVI9TFRSPjxTUEFOIExBTkc9ImZyIj48Rk9OVCBGQUNFPSJDYWxpYnJpIg0KCT5RdWFuZCA6IGx1bmRpIDI4IGF2cmlsIDIwMTQgMTA6MDAtMTE6MDAgKFVUQyswMTowMCkgQnJ1eGVsbGVzLCBDb3BlbmhhZ3UNCgllLCBNYWRyaWQsIFBhcmlzLjwvRk9OVD48L1NQQU4+PC9QPm5uPFAgRElSPUxUUj48U1BBTiBMQU5HPSJmciI+PEZPTlQgDQoJRkFDRT0iQ2FsaWJyaSI+RW1wbGFjZW1lbnQgOiDDoCBkw6lmaW5pcjwvRk9OVD48L1NQQU4+PC9QPm5uPFAgRElSPUxUUj48DQoJU1BBTiBMQU5HPSJmciI+PEZPTlQgRkFDRT0iQ2FsaWJyaSI+UmVtYXJxdWUgOiBsZSBkw6ljYWxhZ2UgR01UIGNpLWRlc3N1cyANCgluZSB0aWVudCBwYXMgY29tcHRlIGRlcyByw6lnbGFnZXMgZGUgbCdoZXVyZSBkJ8OpdMOpLjwvRk9OVD48L1NQQU4+PC9QPm4NCgluPFAgRElSPUxUUj48U1BBTiBMQU5HPSJmciI+PEZPTlQgRkFDRT0iQ2FsaWJyaSI+Kn4qfip+Kn4qfip+Kn4qfip+KjwvRk9OVA0KCT48L1NQQU4+PC9QPm5uPFAgRElSPUxUUj48U1BBTiBMQU5HPSJmciI+PEZPTlQgRkFDRT0iQ2FsaWJyaSI+Qm9uam91ciw8DQoJL0ZPTlQ+PC9TUEFOPjwvUD5ubjxQIERJUj1MVFI+PFNQQU4gTEFORz0iZnIiPjxGT05UIEZBQ0U9IkNhbGlicmkiPk1lcmNpDQoJIMOgIHRvdXMgZGUgdm91cyByZW5kcmUgZGlzcG9uaWJsZSBzdXIgY2UgY3LDqW5lYXUgcG91ciBxdWUgbm91cyBwdWlzc2lvbnMNCgkgZW5zZW1ibGUgdmFsaWRlciBsZXMgw6lsw6ltZW50cyBkdSBicmllZiBwb3VyIGxlIFRBIGR1IDIyLzA1LjwvRk9OVD48L1NQQQ0KCU4+PFNQQU4gTEFORz0iZnIiPjwvU1BBTj48L1A+bm48UCBESVI9TFRSPjxTUEFOIExBTkc9ImZyIj48Qj48L0I+PC9TUEFOPg0KCTxCPjxTUEFOIExBTkc9ImZyLWZyIj48L1NQQU4+PC9CPjwvUD5ubjxQIERJUj1MVFI+PEI+PFNQQU4gTEFORz0iZnItZnIiPg0KCTxGT05UIENPTE9SPSIjMjYyNjI2IiBGQUNFPSJDYWxpYnJpIj5DZGx0LDwvRk9OVD48L1NQQU4+PC9CPjwvUD5ubjxQIERJDQoJUj1MVFI+PEI+PFNQQU4gTEFORz0iZnItZnIiPjxGT05UIENPTE9SPSIjMjYyNjI2IiBGQUNFPSJDYWxpYnJpIj5MdXhpc2xlIFMNCglpZXdlIFRvbGE8L0ZPTlQ+PC9TUEFOPjwvQj48L1A+bm48UCBESVI9TFRSPjxTUEFOIExBTkc9ImZyIj48L1NQQU4+PFNQQU4NCgkgTEFORz0iZnItZnIiPjxGT05UIENPTE9SPSIjMjYyNjI2IiBGQUNFPSJDYWxpYnJpIj5DaGVmIGRlIFByb2pldCBXZWI8L0ZPTg0KCVQ+PC9TUEFOPjwvUD5ubjxQIERJUj1MVFI+PFNQQU4gTEFORz0iZnIiPjwvU1BBTj48QSBIUkVGPSJodHRwOi8vb25lLWRpcg0KCWVjdG9yeS5zc28uZnJhbmNldGVsZWNvbS5mci9hbm51YWlyZS9lbnRpdGUuZG8/YWN0aW9uPVZpZXcmYW1wO3VpZD0lMjMlMDANCgklN0UlMEYlMDREJTBBJTA3cSUxMC0lMUQlMTklMUMlMEMlMTclM0ZZJTI3JTBBTSUwMSUwQiUwNiUzRSUxNC0lMDclMDUlMDklMA0KCUMlMDAlMjlZJTI3JTBBTSUwRSUxNyUxMyUyMiUxNiUyNiUxRCUxNSUwNCUwMCUxMSUyMyUxOG8lMEQlMTNVJTAzJTAwIj48U1BBDQoJTiBMQU5HPSJmciI+PC9TUEFOPjxTUEFOIExBTkc9ImZyIj48L1NQQU4+PFNQQU4gTEFORz0iZnItZnIiPjxGT05UIENPTE9SPSINCgkjMjYyNjI2IiBTSVpFPTIgRkFDRT0iQ2FsaWJyaSI+T3JhbmdlPC9GT05UPjwvU1BBTj48U1BBTiBMQU5HPSJmciI+PC9TUEFOPg0KCTwvQT48U1BBTiBMQU5HPSJmciI+PC9TUEFOPjxTUEFOIExBTkc9ImZyIj48L1NQQU4+PFNQQU4gTEFORz0iZnItZnIiPjxGT05UDQoJIENPTE9SPSIjMjYyNjI2IiBTSVpFPTIgRkFDRT0iQ2FsaWJyaSI+LzwvRk9OVD48L1NQQU4+PFNQQU4gTEFORz0iZnIiPiA8L1MNCglQQU4+PEEgSFJFRj0iaHR0cDovL29uZS1kaXJlY3Rvcnkuc3NvLmZyYW5jZXRlbGVjb20uZnIvYW5udWFpcmUvZW50aXRlLmRvPw0KCWFjdGlvbj1WaWV3JmFtcDt1aWQ9JTIzJTAwJTdFJTA2JTE2RCUwQSUwN3ElMTM3RSUxRiUxRFglMTclMjIlMDEqJTFEJTE5JTANCglEJTE2JTVFJTI4JTE2JTdFJTAwJTFFJTFDJTE3JTEzJTIyJTFCNiUwOCUxOSUxQSUwMCU1RSUyOCUxNiU3RSUwRiUwMiUwOSUwQg0KCSUxMSUyOSUwMSUyNiUwNSUxNSUwQiUwQSUxRiU2MCUxMStUJTE2JTFBIj48U1BBTiBMQU5HPSJmciI+PC9TUEFOPjxTUEFOIExBDQoJTkc9ImZyIj48L1NQQU4+PFNQQU4gTEFORz0iZnItZnIiPjxGT05UIENPTE9SPSIjMjYyNjI2IiBTSVpFPTIgRkFDRT0iQ2FsaWINCglyaSI+T0Y8L0ZPTlQ+PC9TUEFOPjxTUEFOIExBTkc9ImZyIj48L1NQQU4+PC9BPjxTUEFOIExBTkc9ImZyIj48L1NQQU4+PFNQQQ0KCU4gTEFORz0iZnIiPjwvU1BBTj48U1BBTiBMQU5HPSJmci1mciI+PEZPTlQgQ09MT1I9IiMyNjI2MjYiIFNJWkU9MiBGQUNFPSJDDQoJYWxpYnJpIj4vPC9GT05UPjwvU1BBTj48U1BBTiBMQU5HPSJmciI+IDwvU1BBTj48QSBIUkVGPSJodHRwOi8vb25lLWRpcmVjdG8NCglyeS5zc28uZnJhbmNldGVsZWNvbS5mci9hbm51YWlyZS9lbnRpdGUuZG8/YWN0aW9uPVZpZXcmYW1wO3VpZD0lMjMlMDAlN0UlDQoJMEQlMDIlMEIlMDIlMDIlNjAlMUE2VCUxRiUwRUklMUQ5SCUyNSUxRCU1QyUwNyUxME8lMjklMUI3JTAwJTA0JTAxJTAwJTAxJTYNCgkwJTExK1QlMTklMDYlMTElMDAtJTFCLSUxQyUxMSUwMSUxNyUxNyU2MCUxMStUJTE2JTFBJTA0JTFDJTJGJTEwNyUwQyUxQyUwRA0KCSUwNiUxRCUyMVklMjclMEFNJTBFJTE3Ij48U1BBTiBMQU5HPSJmciI+PC9TUEFOPjxTUEFOIExBTkc9ImZyIj48L1NQQU4+PFNQDQoJQU4gTEFORz0iZnItZnIiPjxGT05UIENPTE9SPSIjMjYyNjI2IiBTSVpFPTIgRkFDRT0iQ2FsaWJyaSI+RFJDR1A8L0ZPTlQ+PC8NCglTUEFOPjxTUEFOIExBTkc9ImZyIj48L1NQQU4+PC9BPjxTUEFOIExBTkc9ImZyIj48L1NQQU4+PFNQQU4gTEFORz0iZnIiPjwvUw0KCVBBTj48U1BBTiBMQU5HPSJmci1mciI+PEZPTlQgQ09MT1I9IiMyNjI2MjYiIFNJWkU9MiBGQUNFPSJDYWxpYnJpIj4vPC9GT05UDQoJPjwvU1BBTj48U1BBTiBMQU5HPSJmciI+IDwvU1BBTj48QSBIUkVGPSJodHRwOi8vb25lLWRpcmVjdG9yeS5zc28uZnJhbmNldGUNCglsZWNvbS5mci9hbm51YWlyZS9lbnRpdGUuZG8/YWN0aW9uPVZpZXcmYW1wO3VpZD0lMjMlMDAlN0UlMEQlMTMlMDclMDklNUUlDQoJMjMlMDAlN0UlMEQlMDIlMEIlMDIlMDIlNjAlMUE2VCUxRiUwRUklMUQ5SCUyNSUxRCU1QyUwNyUxME8lMjklMUI3JTAwJTA0JTANCgkxJTAwJTAxJTYwJTExK1QlMTklMDYlMTElMDAtJTFCLSUxQyUxMSUwMSUxNyUxNyU2MCUxMStUJTE2JTFBJTA0JTFDJTJGJTEwNw0KCSUwQyUxQyUwRCUwNiUxRCUyMVklMjclMEFNJTBFJTE3Ij48U1BBTiBMQU5HPSJmciI+PC9TUEFOPjxTUEFOIExBTkc9ImZyIj48DQoJL1NQQU4+PFNQQU4gTEFORz0iZnItZnIiPjxGT05UIENPTE9SPSIjMjYyNjI2IiBTSVpFPTIgRkFDRT0iQ2FsaWJyaSI+RENPTDwNCgkvRk9OVD48L1NQQU4+PFNQQU4gTEFORz0iZnIiPjwvU1BBTj48L0E+PFNQQU4gTEFORz0iZnIiPjwvU1BBTj48U1BBTiBMQU5HPQ0KCSJmciI+PC9TUEFOPjxTUEFOIExBTkc9ImZyLWZyIj48Rk9OVCBDT0xPUj0iIzI2MjYyNiIgU0laRT0yIEZBQ0U9IkNhbGlicmkiDQoJPi88L0ZPTlQ+PC9TUEFOPjxTUEFOIExBTkc9ImZyIj4gPC9TUEFOPjxBIEhSRUY9Imh0dHA6Ly9vbmUtZGlyZWN0b3J5LnNzby4NCglmcmFuY2V0ZWxlY29tLmZyL2FubnVhaXJlL2VudGl0ZS5kbz9hY3Rpb249VmlldyZhbXA7dWlkPSUyMyUwMCU3RSUxQSUxNSUwDQoJNCUwMyUxMS0lMDclMjZFJTFGJTFEWCUxNiUyRiUxQSUyRkUlMUYlMURYJTE2JTNFJTE2JTI0JTE5JTVDJTA3JTEwTyUyMyUxM28NCgklMDYlMDVVJTAzJTA2JTYwJTFBNlQlMTUlMDYlMTElMUI4JTFDJTI2JTFBJTVDJTBDJTA2TyUyNSUxQjclMUIlMTElMDYlMEIlMA0KCTctJTFDMSUwQyU1QyUwQyUwNk8qJTA3JTIyJTA3JTEzJTBEJTExJTE3KyUxMCslMDYlMUREJTAxJTExcSUxMzEiPjxTUEFOIExBDQoJTkc9ImZyIj48L1NQQU4+PFNQQU4gTEFORz0iZnIiPjwvU1BBTj48U1BBTiBMQU5HPSJmci1mciI+PEZPTlQgQ09MT1I9IiMyNjINCgk2MjYiIFNJWkU9MiBGQUNFPSJDYWxpYnJpIj5TRUxGQ0FSRTwvRk9OVD48L1NQQU4+PFNQQU4gTEFORz0iZnIiPjwvU1BBTj48Lw0KCUE+PFNQQU4gTEFORz0iZnIiPjwvU1BBTj48U1BBTiBMQU5HPSJmciI+PC9TUEFOPjxTUEFOIExBTkc9ImZyLWZyIj48Rk9OVCBDDQoJT0xPUj0iIzI2MjYyNiIgU0laRT0yIEZBQ0U9IkNhbGlicmkiPiA8L0ZPTlQ+PC9TUEFOPjwvUD5ubjxQIERJUj1MVFI+PFNQDQoJQU4gTEFORz0iZnItZnIiPjxGT05UIENPTE9SPSIjMjYyNjI2IiBTSVpFPTIgRkFDRT0iQ2FsaWJyaSI+MDEgNTcgMzYgMDEgNzANCgk8L0ZPTlQ+PC9TUEFOPjwvUD5ubjxQIERJUj1MVFI+PFNQQU4gTEFORz0iZnIiPjwvU1BBTj48U1BBTiBMQU5HPSJmciI+PC8NCglTUEFOPjxTUEFOIExBTkc9ImZyLWZyIj48Rk9OVCBDT0xPUj0iIzI2MjYyNiIgU0laRT0yIEZBQ0U9IkNhbGlicmkiPjA3IDg5IA0KCTUxIDgxIDYxPC9GT05UPjwvU1BBTj48L1A+bm48UCBESVI9TFRSPjxTUEFOIExBTkc9ImZyIj48L1NQQU4+PEEgSFJFRj0iZg0KCWlsZTovL2x1eGlzbGUuc2lld2V0b2xhQG9yYW5nZS5jb20iPjxTUEFOIExBTkc9ImZyIj48L1NQQU4+PFNQQU4gTEFORz0iZnItDQoJZnIiPjxGT05UIENPTE9SPSIjRjc5NjQ2IiBGQUNFPSJDYWxpYnJpIj5sdXhpc2xlLnNpZXdldG9sYUBvcmFuZ2UuY29tPC9GT04NCglUPjwvU1BBTj48U1BBTiBMQU5HPSJmciI+PC9TUEFOPjwvQT48U1BBTiBMQU5HPSJmciI+PC9TUEFOPjxTUEFOIExBTkc9ImZyLQ0KCWZyIj48L1NQQU4+PC9QPm5uPFAgRElSPUxUUj48U1BBTiBMQU5HPSJmciI+PC9TUEFOPjxTUEFOIExBTkc9ImZyIj48L1NQQQ0KCU4+PFNQQU4gTEFORz0iZnIiPjwvU1BBTj48U1BBTiBMQU5HPSJmci1mciI+PEJSPm48L1NQQU4+PC9QPm5uPFAgRElSPUxUDQoJUj48U1BBTiBMQU5HPSJmciI+PC9TUEFOPjxTUEFOIExBTkc9ImZyLWZyIj48L1NQQU4+PC9QPm5uPFAgRElSPUxUUj48U1BBDQoJTiBMQU5HPSJmciI+PC9TUEFOPjwvUD5ubjxQIERJUj1MVFI+PFNQQU4gTEFORz0iZnIiPjwvU1BBTj48L1A+bm48L0JPRA0KCVk+bjwvSFRNTD4NClgtTUlDUk9TT0ZULUNETy1CVVNZU1RBVFVTOlRFTlRBVElWRQ0KWC1NSUNST1NPRlQtQ0RPLUlNUE9SVEFOQ0U6MQ0KWC1NSUNST1NPRlQtRElTQUxMT1ctQ09VTlRFUjpGQUxTRQ0KWC1NUy1PTEstQVBQVExBU1RTRVFVRU5DRTowDQpYLU1TLU9MSy1DT05GVFlQRTowDQpCRUdJTjpWQUxBUk0NClRSSUdHRVI6LVBUMTVNDQpBQ1RJT046RElTUExBWQ0KREVTQ1JJUFRJT046UmVtaW5kZXINCkVORDpWQUxBUk0NCkVORDpWRVZFTlQNCkJFR0lOOlZFVkVOVA0KQVRURU5ERUU7Q049IkFHTkVTIFBhdHJpY2sgT0YvRFNJRiI7UlNWUD1UUlVFOm1haWx0bzpwYXRyaWNrLmFnbmVzQG9yYW5nZS5jDQoJb20NCkFUVEVOREVFO0NOPSJQT0lST1QgSmVhbiBEYXZpZCBPRi9EU0lGIjtSU1ZQPVRSVUU6bWFpbHRvOmplYW5kYXZpZC5wb2lyb3RAbw0KCXJhbmdlLmNvbQ0KQVRURU5ERUU7Q049IkJFVVpPTiBTb2xlbmUgT0YvRFNJRiI7UlNWUD1UUlVFOm1haWx0bzpzb2xlbmUuYmV1em9uQG9yYW5nZS5jDQoJb20NCkFUVEVOREVFO0NOPSJDSEVTVEVSUyBEYW5pZWwgRXh0IE9GL0RTSUYiO1JTVlA9VFJVRTptYWlsdG86ZGNoZXN0ZXJzLmV4dEBvcg0KCWFuZ2UuY29tDQpBVFRFTkRFRTtDTj0iU09XIEJldHR5IEV4dCBPRi9EU0lGIjtSU1ZQPVRSVUU6bWFpbHRvOmJlc293LmV4dEBvcmFuZ2UuY29tDQpBVFRFTkRFRTtDTj0iU0FMSEkgQ2hhZmlhYSBFeHQgT0YvRFNJRiI7UlNWUD1UUlVFOm1haWx0bzpjc2FsaGkuZXh0QG9yYW5nZS4NCgljb20NCkFUVEVOREVFO0NOPSJCT1VLSExJRkEgS2FyaW0gT0YvRFNJRiI7UlNWUD1UUlVFOm1haWx0bzprYXJpbS5ib3VraGxpZmFAb3Jhbg0KCWdlLmNvbQ0KQVRURU5ERUU7Q049Ik9VTEQgQUhNRURPVSBNb2hhbWVkIExlbWluZSBPRi9EU0lGIjtSU1ZQPVRSVUU6bWFpbHRvOmxlbWluZS5hDQoJaG1lZG91QG9yYW5nZS5jb20NCkFUVEVOREVFO0NOPSJORElBWUUgWWFraGFtIE9GL0RTSUYiO1JTVlA9VFJVRTptYWlsdG86eWFraGFtLm5kaWF5ZUBvcmFuZ2UuYw0KCW9tDQpBVFRFTkRFRTtDTj0iUkVDSEVSIE5pY29sYXMgT0YvRFNJRiI7UlNWUD1UUlVFOm1haWx0bzpuaWNvbGFzLnJlY2hlckBvcmFuZ2UNCgkuY29tDQpBVFRFTkRFRTtDTj0iQ0FUUk9VIE1hdGhpYXMgT0YvRFNJRiI7UlNWUD1UUlVFOm1haWx0bzptYXRoaWFzLmNhdHJvdUBvcmFuZ2UNCgkuY29tDQpBVFRFTkRFRTtDTj0iWkhPVSBKaW5nIEppbmcgT0YvRFNJRiI7UlNWUD1UUlVFOm1haWx0bzpqaW5namluZy56aG91QG9yYW5nZS4NCgljb20NCkFUVEVOREVFO0NOPSJDQVNTT1UgQ2hyaXN0b3BoZSBFeHQgT0YvRFNJRiI7UlNWUD1UUlVFOm1haWx0bzpjY2Fzc291LmV4dEBvcg0KCWFuZ2UuY29tDQpBVFRFTkRFRTtDTj0iQlJJTExBTlQgSmVyb21lIEV4dCBPRi9EU0lGIjtSU1ZQPVRSVUU6bWFpbHRvOmplYnJpbGxhbnQuZXh0QG8NCglyYW5nZS5jb20NCkFUVEVOREVFO0NOPSJCQVlBUlQgT2xpdmllciBPRi9EU0lGIjtSU1ZQPVRSVUU6bWFpbHRvOm9saXZpZXIuYmF5YXJ0QG9yYW5nZQ0KCS5jb20NCkFUVEVOREVFO0NOPSJGQURMQU9VSSBJZHJpc3MgRXh0IE9GL0RTSUYiO1JTVlA9VFJVRTptYWlsdG86aWZhZGxhb3VpLmV4dEBvcg0KCWFuZ2UuY29tDQpBVFRFTkRFRTtDTj0iRkVMSUhPIFdpbGZyaWQgT0YvRFNJRiI7UlNWUD1UUlVFOm1haWx0bzp3aWxmcmlkLmZlbGlob0BvcmFuZ2UNCgkuY29tDQpBVFRFTkRFRTtDTj0iQUxHRVIgR3LDqWdvcnkgT0YvRFNJRiI7UlNWUD1UUlVFOm1haWx0bzpncmVnb3J5LmFsZ2VyQG9yYW5nZS4NCgljb20NCkFUVEVOREVFO0NOPSJCUkFORFQgQWxleGlzIE9GL0RTSUYiO1JTVlA9VFJVRTptYWlsdG86YWxleGlzLmJyYW5kdEBvcmFuZ2UuYw0KCW9tDQpBVFRFTkRFRTtDTj0iTUVORFJBUyBGcmFuY2sgT0YvRFNJRiI7UlNWUD1UUlVFOm1haWx0bzpmcmFuY2subWVuZHJhc0BvcmFuZ2UNCgkuY29tDQpBVFRFTkRFRTtDTj0iQ0hFSEFJQk9VIEF6ZWRkaW5lIE9GL0RTSUYiO1JTVlA9VFJVRTptYWlsdG86YXplZGRpbmUuY2hlaGFpYm8NCgl1QG9yYW5nZS5jb20NCkFUVEVOREVFO0NOPSJaQUhSQU1BTkUgSGFzc2FuIE9GL0RTSUYiO1JTVlA9VFJVRTptYWlsdG86aGFzc2FuLnphaHJhbWFuZUBvcg0KCWFuZ2UuY29tDQpBVFRFTkRFRTtDTj0iVE9ET1JPVkEgQW5hIE9GL0RTSUYiO1JTVlA9VFJVRTptYWlsdG86YW5hLnRvZG9yb3ZhQG9yYW5nZS5jb20NCkFUVEVOREVFO0NOPSJQRVRJVCBKdWxpZXR0ZSBFeHQgT0YvRFNJRiI7UlNWUD1UUlVFOm1haWx0bzpqcGV0aXQuZXh0QG9yYW5nZQ0KCS5jb20NCkFUVEVOREVFO0NOPSJCUkVURUFVWCBMaW9uZWwgT0YvRFNJRiI7UlNWUD1UUlVFOm1haWx0bzpsaW9uZWwxLmJyZXRlYXV4QG9yYQ0KCW5nZS5jb20NCkFUVEVOREVFO0NOPSJCT1VDSEFSRCBDaHJpc3RvcGhlIE9GL0RTSUYiO1JTVlA9VFJVRTptYWlsdG86Y2hyaXN0b3BoZTEuYm91Yw0KCWhhcmRAb3JhbmdlLmNvbQ0KQVRURU5ERUU7Q049IkNIQUxMSUdVSSBTaWRpIElkcmlzcyBFeHQgT0YvRFNJRiI7UlNWUD1UUlVFOm1haWx0bzpzY2hhbGxpZ3VpDQoJLmV4dEBvcmFuZ2UuY29tDQpBVFRFTkRFRTtDTj0iR09VU1NFQVUgTWF4aW1lIEV4dCBPRi9EU0lGIjtSU1ZQPVRSVUU6bWFpbHRvOm1nb3Vzc2VhdS5leHRAb3INCglhbmdlLmNvbQ0KQVRURU5ERUU7Q049IkFST05ERUwgRXJpY2sgRXh0IE9GL0RTSUYiO1JTVlA9VFJVRTptYWlsdG86ZWFyb25kZWwuZXh0QG9yYW5nDQoJZS5jb20NCkFUVEVOREVFO0NOPWVuZ3VlcnJhbi5sb3VybWVAZ2ZpLmZyO1JTVlA9VFJVRTptYWlsdG86ZW5ndWVycmFuLmxvdXJtZUBnZmkuZg0KCXINCkFUVEVOREVFO0NOPSJCRU5LQURET1VSIEthZGRvdXIgRXh0IE9GL0RTSUYiO1JTVlA9VFJVRTptYWlsdG86a2JlbmthZGRvdXIuZQ0KCXh0QG9yYW5nZS5jb20NCkFUVEVOREVFO0NOPSJST0JJTiBTdMOpcGhhbmUgRXh0IE9GL0RTSUYiO1JTVlA9VFJVRTptYWlsdG86c3JvYmluLmV4dEBvcmFuZw0KCWUuY29tDQpBVFRFTkRFRTtDTj0iTU9VS1JJTSBBZGlsIEV4dCBPRi9EU0lGIjtSU1ZQPVRSVUU6bWFpbHRvOmFtb3VrcmltLmV4dEBvcmFuZ2UNCgkuY29tDQpBVFRFTkRFRTtDTj0iS0hBTElLQU5FIE5hamxhYSBPRi9EU0lGIjtSU1ZQPVRSVUU6bWFpbHRvOm5hamxhYS5raGFsaWthbmVAb3INCglhbmdlLmNvbQ0KQVRURU5ERUU7Q049IkNIRVZBTElFUiBTeWx2YWluIE9GL0RTSUYiO1JTVlA9VFJVRTptYWlsdG86c3lsdmFpbi5jaGV2YWxpZXJADQoJb3JhbmdlLmNvbQ0KQVRURU5ERUU7Q049IlpBWUFORSBTb3VmaWFuZSBFeHQgT0YvRFNJRiI7UlNWUD1UUlVFOm1haWx0bzpzemF5YW5lLmV4dEBvcmFuDQoJZ2UuY29tDQpBVFRFTkRFRTtDTj0iQ0hBTVNFRERJTkUgU2FsaW0gRXh0IE9GL0RTSUYiO1JTVlA9VFJVRTptYWlsdG86c2NoYW1zZWRkaW5lLmUNCgl4dEBvcmFuZ2UuY29tDQpBVFRFTkRFRTtDTj0iTE9VUE1PTiBHaGlzbGFpbiBPRi9EU0lGIjtSU1ZQPVRSVUU6bWFpbHRvOmdoaXNsYWluLmxvdXBtb25Ab3INCglhbmdlLmNvbQ0KQVRURU5ERUU7Q049IlNBVklWQU5IIEVyaWMgRXh0IE9GL0RTSUYiO1JTVlA9VFJVRTptYWlsdG86ZXNhdml2YW5oLmV4dEBvcmFuDQoJZ2UuY29tDQpBVFRFTkRFRTtDTj0iR0VSVU0gVmFsZW50aW4gRXh0IE9GL0RTSUYiO1JTVlA9VFJVRTptYWlsdG86dmdlcnVtLmV4dEBvcmFuZ2UNCgkuY29tDQpBVFRFTkRFRTtDTj0iJ09saXZpZXIgVkFOU09OJyI7UlNWUD1UUlVFOm1haWx0bzpvbGl2aWVyLnZhbnNvbkBncmVlbi1jb25zZWkNCglsLmNvbQ0KQVRURU5ERUU7Q049IlpPUkRBTiBQaGlsaXBwZSBPRi9EU0lGIjtSU1ZQPVRSVUU6bWFpbHRvOnBoaWxpcHBlLnpvcmRhbkBvcmFuDQoJZ2UuY29tDQpBVFRFTkRFRTtDTj0iRkVOQVlST1UgQW5uZSBFeHQgT0YvRFNJRiI7UlNWUD1UUlVFOm1haWx0bzphZmVuYXlyb3UuZXh0QG9yYW4NCglnZS5jb20NCkFUVEVOREVFO0NOPSJCRUxPVUJBRCBNeXJpYW0gRXh0IE9GL0RTSUYiO1JTVlA9VFJVRTptYWlsdG86bWJlbG91YmFkLmV4dEBvcg0KCWFuZ2UuY29tDQpBVFRFTkRFRTtDTj0iTEFWQUJSRSBDbMOpbWVudCBPRi9EU0lGIjtSU1ZQPVRSVUU6bWFpbHRvOmNsZW1lbnQubGF2YWJyZUBvcmENCgluZ2UuY29tDQpDTEFTUzpQVUJMSUMNCkNSRUFURUQ6MjAxNDA0MjNUMTIxODQ3Wg0KREVTQ1JJUFRJT046Qm9uam91ciB0b3V0IGxlIG1vbmRlLG5uQXByw6hzIDIgYW5zIHBhc3PDqXMgYXUgc2VpbiBkZSBs4oCZDQoJw6lxdWlwZSBMZWdhY3ksIGxlIHRlbXBzIGVzdCB2ZW51IHBvdXIgbW9pIGRlIHBhcnRpciB2ZXJzIGTigJlhdXRyZXMgYXZlbg0KCXR1cmVz4oCmLm5uSmUgdm91cyBpbnZpdGUgw6AgcGFydGFnZXIgdW4gcGV0aXQtZMOpamV1bmVyIGxlIE1lcmNyZWRpIDMwIA0KCWF2cmlsIDIwMTQgw6AgMTBoMDAgZGFucyBs4oCZb3BlbnNwYWNlIDk0N0Iubm5O4oCZaMOpc2l0ZXogcGFzIMOgIHRyYW5zZg0KCcOpcmVyIGzigJlpbnZpdGF0aW9uIGF1eCBwZXJzb25uZXMgcXVlIGrigJlhdXJhaXMgb3VibGnDqS5ubm5Db3JkaWFsZW1lDQoJbnQsblRhcmlrIEZBUklTbm4NCkRURU5EO1RaSUQ9IlJvbWFuY2UgU3RhbmRhcmQgVGltZSI6MjAxNDA0MzBUMTAzMDAwDQpEVFNUQU1QOjIwMTQwNDIzVDEyMTgzM1oNCkRUU1RBUlQ7VFpJRD0iUm9tYW5jZSBTdGFuZGFyZCBUaW1lIjoyMDE0MDQzMFQxMDAwMDANCkxBU1QtTU9ESUZJRUQ6MjAxNDA0MjNUMTIxODQ3Wg0KTE9DQVRJT046b3BlbnNwYWNlIDk0N0INCk9SR0FOSVpFUjtDTj0iRkFSSVMgVGFyaWsgRXh0IDEgT0YvRFNJRiI6bWFpbHRvOnRhZmFyaXMuZXh0QG9yYW5nZS5jb20NClBSSU9SSVRZOjUNClNFUVVFTkNFOjANClNVTU1BUlk7TEFOR1VBR0U9ZnI6UG90IGRlIGTDqXBhcnQgDQpUUkFOU1A6T1BBUVVFDQpVSUQ6MDQwMDAwMDA4MjAwRTAwMDc0QzVCNzEwMUE4MkUwMDgwMDAwMDAwMEQwOTU5MzAwRkU1RUNGMDEwMDAwMDAwMDAwMDAwMDANCgkwMTAwMDAwMDBBMEI5Mzk2RkI5N0E4RjRFOEQ3REVGMkVBNzlGOEQ0Qw0KWC1BTFQtREVTQztGTVRUWVBFPXRleHQvaHRtbDo8IURPQ1RZUEUgSFRNTCBQVUJMSUMgIi0vL1czQy8vRFREIEhUTUwgMy4yLy9FDQoJTiI+bjxIVE1MPm48SEVBRD5uPE1FVEEgTkFNRT0iR2VuZXJhdG9yIiBDT05URU5UPSJNUyBFeGNoYW5nZSBTZXJ2ZXIgdmUNCglyc2lvbiAxNC4wMi41MDA0LjAwMCI+bjxUSVRMRT48L1RJVExFPm48L0hFQUQ+bjxCT0RZPm48IS0tIENvbnZlcnRlZCBmDQoJcm9tIHRleHQvcnRmIGZvcm1hdCAtLT5ubjxQIERJUj1MVFI+PFNQQU4gTEFORz0iZnIiPjwvU1BBTj48U1BBTiBMQU5HPSJmDQoJciI+PEZPTlQgRkFDRT0iQ2FsaWJyaSI+Qm9uam91ciB0b3V0IGxlIG1vbmRlLDwvRk9OVD48L1NQQU4+PC9QPm5uPFAgREkNCglSPUxUUj48U1BBTiBMQU5HPSJmciI+PC9TUEFOPjxTUEFOIExBTkc9ImZyIj48L1NQQU4+PFNQQU4gTEFORz0iZnIiPjwvU1BBTg0KCT48L1A+bm48UCBESVI9TFRSPjxTUEFOIExBTkc9ImZyIj48L1NQQU4+PFNQQU4gTEFORz0iZnIiPjxGT05UIEZBQ0U9IkNhbA0KCWlicmkiPkFwcsOocyAyIGFucyBwYXNzw6lzIGF1IHNlaW4gZGUgbOKAmcOpcXVpcGUgTGVnYWN5LCBsZSB0ZW1wcyBlc3QgdmUNCgludSBwb3VyIG1vaSBkZSBwYXJ0aXIgdmVycyBk4oCZYXV0cmVzIGF2ZW50dXJlc+KApi48L0ZPTlQ+PC9TUEFOPjwvUD5ubjwNCglQIERJUj1MVFI+PFNQQU4gTEFORz0iZnIiPjxGT05UIEZBQ0U9IkNhbGlicmkiPkplIHZvdXMgaW52aXRlIMOgIHBhcnRhZ2VyIA0KCXVuIHBldGl0LWTDqWpldW5lciBsZSBNZXJjcmVkaSAzMCBhdnJpbCAyMDE0IMOgIDEwaDAwIGRhbnMgbOKAmW9wZW5zcGFjZSA5DQoJNDdCLjwvRk9OVD48L1NQQU4+PC9QPm5uPFAgRElSPUxUUj48U1BBTiBMQU5HPSJmciI+PEZPTlQgRkFDRT0iQ2FsaWJyaSI+DQoJTuKAmWjDqXNpdGV6IHBhcyDDoCB0cmFuc2bDqXJlciBs4oCZaW52aXRhdGlvbiBhdXggcGVyc29ubmVzIHF1ZSBq4oCZYXVyYWkNCglzIG91Ymxpw6kuPC9GT05UPjwvU1BBTj48L1A+bjxCUj5ubjxQIERJUj1MVFI+PFNQQU4gTEFORz0iZnIiPjxGT05UIEZBQw0KCUU9IkNhbGlicmkiPkNvcmRpYWxlbWVudCw8L0ZPTlQ+PC9TUEFOPjwvUD5ubjxQIERJUj1MVFI+PFNQQU4gTEFORz0iZnIiDQoJPjxGT05UIEZBQ0U9IkNhbGlicmkiPlRhcmlrIEZBUklTPC9GT05UPjwvU1BBTj48U1BBTiBMQU5HPSJmciI+PC9TUEFOPjxTUEENCglOIExBTkc9ImZyIj48L1NQQU4+PC9QPm5uPFAgRElSPUxUUj48U1BBTiBMQU5HPSJmciI+PC9TUEFOPjxTUEFOIExBTkc9ImYNCglyIj48L1NQQU4+PFNQQU4gTEFORz0iZnIiPjwvU1BBTj48L1A+bm48L0JPRFk+bjwvSFRNTD4NClgtTUlDUk9TT0ZULUNETy1CVVNZU1RBVFVTOlRFTlRBVElWRQ0KWC1NSUNST1NPRlQtQ0RPLUlNUE9SVEFOQ0U6MQ0KWC1NSUNST1NPRlQtRElTQUxMT1ctQ09VTlRFUjpGQUxTRQ0KWC1NUy1PTEstQVVUT1NUQVJUQ0hFQ0s6RkFMU0UNClgtTVMtT0xLLUNPTkZUWVBFOjANCkJFR0lOOlZBTEFSTQ0KVFJJR0dFUjotUFQxNU0NCkFDVElPTjpESVNQTEFZDQpERVNDUklQVElPTjpSZW1pbmRlcg0KRU5EOlZBTEFSTQ0KRU5EOlZFVkVOVA0KQkVHSU46VkVWRU5UDQpBVFRFTkRFRTtDTj0iTEFWQUJSRSBDbMOpbWVudCBPRi9EU0lGIjtSU1ZQPVRSVUU6bWFpbHRvOmNsZW1lbnQubGF2YWJyZUBvcmENCgluZ2UuY29tDQpBVFRFTkRFRTtDTj1jaHJpc3RvcGhlLmNvbWJldEBncmVlbi1jb25zZWlsLmNvbTtSU1ZQPVRSVUU6bWFpbHRvOmNocmlzdG9waGUNCgkuY29tYmV0QGdyZWVuLWNvbnNlaWwuY29tDQpBVFRFTkRFRTtDTj1vbGl2aWVyLnZhbnNvbkBncmVlbi1jb25zZWlsLmNvbTtSU1ZQPVRSVUU6bWFpbHRvOm9saXZpZXIudmFuc28NCgluQGdyZWVuLWNvbnNlaWwuY29tDQpBVFRFTkRFRTtDTj1nZW9yZ2VzLnJvY2NvQGdyZWVuLWNvbnNlaWwuY29tO1JTVlA9VFJVRTptYWlsdG86Z2Vvcmdlcy5yb2Njb0ANCglncmVlbi1jb25zZWlsLmNvbQ0KQ0xBU1M6UFVCTElDDQpDUkVBVEVEOjIwMTQwNDI0VDE0MjAwM1oNCkRFU0NSSVBUSU9OOm5Ob20JTW90IGRlIHBhc3NlCU7CsCBkZSBwb250CURhdGUgKEFBQUEtTU0tSkopCUhldXJlIGRlIGTDqWJ1DQoJdAlGdXNlYXV4IGhvcmFpcmUJblBvaW5MTzI5MDQyMDE0CTI1MDQyMDE0CSszMyAxIDU4IDk5IDUzIDg4CTIwMTQtMDQtMjUJMQ0KCTA6MzAJKEdNVCswMTowMCkgQnJ1eGVsbGVzLCBDb3BlbmhhZ3VlLCBNYWRyaWQsIFBhcmlzIChoZXVyZSBkJ8OpdMOpKQkNCglublZvdXMgcG91dmV6IGZvdXJuaXIgw6Agdm9zIGludml0w6lzIGxlcyBsaWVucyBzdWl2YW50cyBwb3VyIGxldXIgcGVybWV0DQoJdHJlIGRlIHJlam9pbmRyZSBsYSBjb25mw6lyZW5jZSBmYWNpbGVtZW50IGVuIHF1ZWxxdWVzIGNsaWNzIDogbioJZGVwdWlzIA0KCUlOVFJBTkVUIDogY2xpcXVleiBpY2kgPGh0dHBzOi8vbW9uc2kuc3NvLmZyYW5jZXRlbGVjb20uZnIvaW5kZXguYXNwP3RhcmdlDQoJdD1IVFRQJTNBJTJGJTJGY29vcG5ldC5zc28uZnJhbmNldGVsZWNvbS5mciUyRkRlZmF1bHQuYXNweCUzZlJldHVyblVybCUzZCUNCgkyNTJmRGlyZWN0QWNjZXNzJTI1MmZTdGFydENvbmZlcmVuY2VCeVVybC5hc3B4JTI1M2ZjcElkJTI1M2RGRDA3MTlGNi1ERTdFLQ0KCTRBRTctOUE0OC1GMDJBNjY1NDE2QkU+ICBuKglkZXB1aXMgSU5URVJORVQgOiBjbGlxdWV6IGljaSA8aHR0cHM6Ly9jb29wbmUNCgl0Lm11bHRpbWVkaWEtY29uZmVyZW5jZS5vcmFuZ2UtYnVzaW5lc3MuY29tL0RpcmVjdEFjY2Vzcy9TdGFydENvbmZlcmVuY2VCeQ0KCVVybC5hc3B4P2NwSWQ9RkQwNzE5RjYtREU3RS00QUU3LTlBNDgtRjAyQTY2NTQxNkJFPiAgbm4NCkRURU5EO1RaSUQ9IlJvbWFuY2UgU3RhbmRhcmQgVGltZSI6MjAxNDA0MjVUMTEzMDAwDQpEVFNUQU1QOjIwMTQwNDI0VDE0MjAwMFoNCkRUU1RBUlQ7VFpJRD0iUm9tYW5jZSBTdGFuZGFyZCBUaW1lIjoyMDE0MDQyNVQxMDMwMDANCkxBU1QtTU9ESUZJRUQ6MjAxNDA0MjVUMjExOTUxWg0KTE9DQVRJT046KzMzIDEgNTggOTkgNTMgODgNCk9SR0FOSVpFUjtDTj0iRkVOQVlST1UgQW5uZSBFeHQgT0YvRFNJRiI6bWFpbHRvOmFmZW5heXJvdS5leHRAb3JhbmdlLmNvbQ0KUFJJT1JJVFk6NQ0KU0VRVUVOQ0U6MA0KU1VNTUFSWTtMQU5HVUFHRT1mcjpQb2ludCBMTw0KVFJBTlNQOk9QQVFVRQ0KVUlEOjA0MDAwMDAwODIwMEUwMDA3NEM1QjcxMDFBODJFMDA4MDAwMDAwMDBFMEVGODQwQUQ5NUZDRjAxMDAwMDAwMDAwMDAwMDAwDQoJMDEwMDAwMDAwOTNCNDkxQTgzNzI0RTc0OUE1OEZCQUVENzA4M0Q2MDcNClgtQUxULURFU0M7Rk1UVFlQRT10ZXh0L2h0bWw6PCFET0NUWVBFIEhUTUwgUFVCTElDICItLy9XM0MvL0RURCBIVE1MIDMuMi8vRQ0KCU4iPm48SFRNTD5uPEhFQUQ+bjxNRVRBIE5BTUU9IkdlbmVyYXRvciIgQ09OVEVOVD0iTVMgRXhjaGFuZ2UgU2VydmVyIHZlDQoJcnNpb24gMTQuMDIuNTAwNC4wMDAiPm48VElUTEU+PC9USVRMRT5uPC9IRUFEPm48Qk9EWT5uPCEtLSBDb252ZXJ0ZWQgZg0KCXJvbSB0ZXh0L3J0ZiBmb3JtYXQgLS0+bm48UCBESVI9TFRSPjxTUEFOIExBTkc9ImZyIj48L1NQQU4+PFNQQU4gTEFORz0iZg0KCXIiPjwvU1BBTj48U1BBTiBMQU5HPSJmciI+PC9TUEFOPjxTUEFOIExBTkc9ImZyIj48L1NQQU4+PC9QPm5uPFAgRElSPUxUUg0KCSBBTElHTj1DRU5URVI+PFNQQU4gTEFORz0iZnIiPjxCPjwvQj48L1NQQU4+PFNQQU4gTEFORz0iZnIiPjxCPjwvQj48L1NQQU4+DQoJPFNQQU4gTEFORz0iZnIiPjxCPjwvQj48L1NQQU4+PEI+PFNQQU4gTEFORz0iZnIiPjxGT05UIEZBQ0U9IlRpbWVzIE5ldyBSb20NCglhbiI+Tm9tJm5ic3A7Jm5ic3A7Jm5ic3A7Jm5ic3A7IE1vdCBkZSBwYXNzZSZuYnNwOyZuYnNwOyZuYnNwOyBOwrAgDQoJZGUgcG9udCZuYnNwOyZuYnNwOyZuYnNwOyZuYnNwOyZuYnNwOyBEYXRlIChBQUFBLU1NLUpKKSZuYnNwOyZuYnNwOw0KCSZuYnNwOyZuYnNwOyZuYnNwOyZuYnNwOyBIZXVyZSBkZSBkw6lidXQmbmJzcDsgRnVzZWF1eCBob3JhaXJlPC9GT05UPg0KCTwvU1BBTj48L0I+PFNQQU4gTEFORz0iZnIiPjwvU1BBTj48U1BBTiBMQU5HPSJmciI+PC9TUEFOPjxTUEFOIExBTkc9ImZyIj48DQoJL1NQQU4+PFNQQU4gTEFORz0iZnIiPjxCUj5uPC9TUEFOPjxTUEFOIExBTkc9ImZyIj48L1NQQU4+PFNQQU4gTEFORz0iZnIiPg0KCTwvU1BBTj48U1BBTiBMQU5HPSJmciI+PC9TUEFOPjxTUEFOIExBTkc9ImZyIj48Rk9OVCBGQUNFPSJUaW1lcyBOZXcgUm9tYW4iDQoJPlBvaW5MTzI5MDQyMDE0Jm5ic3A7IDI1MDQyMDE0Jm5ic3A7Jm5ic3A7Jm5ic3A7Jm5ic3A7Jm5ic3A7Jm5ic3A7Jg0KCW5ic3A7ICszMyAxIDU4IDk5IDUzIDg4Jm5ic3A7Jm5ic3A7Jm5ic3A7Jm5ic3A7Jm5ic3A7Jm5ic3A7IDIwMTQtMDQNCgktMjUmbmJzcDsmbmJzcDsmbmJzcDsmbmJzcDsmbmJzcDsgMTA6MzAmbmJzcDsmbmJzcDsgKEdNVCswMTowMCkgQnJ1DQoJeGVsbGVzLCBDb3BlbmhhZ3VlLCBNYWRyaWQsIFBhcmlzIChoZXVyZSBkJ8OpdMOpKSZuYnNwOzwvRk9OVD48L1NQQU4+PA0KCVNQQU4gTEFORz0iZnIiPjwvU1BBTj48U1BBTiBMQU5HPSJmciI+PC9TUEFOPjxTUEFOIExBTkc9ImZyIj48L1NQQU4+PFNQQU4gDQoJTEFORz0iZnIiPjxCUj5uPC9TUEFOPjxTUEFOIExBTkc9ImZyIj48L1NQQU4+PFNQQU4gTEFORz0iZnIiPjwvU1BBTj48U1BBTg0KCSBMQU5HPSJmciI+PC9TUEFOPjxTUEFOIExBTkc9ImZyIj48QlI+bjxGT05UIFNJWkU9MiBGQUNFPSJBcmlhbCI+Vm91cyBwb3UNCgl2ZXogZm91cm5pciDDoCB2b3MgaW52aXTDqXMgbGVzIGxpZW5zIHN1aXZhbnRzIHBvdXIgbGV1ciBwZXJtZXR0cmUgZGUgcmVqbw0KCWluZHJlIGxhIGNvbmbDqXJlbmNlIGZhY2lsZW1lbnQgZW4gcXVlbHF1ZXMgY2xpY3MgOiA8L0ZPTlQ+PC9TUEFOPjwvUD5ubg0KCTxQIERJUj1MVFI+PFNQQU4gTEFORz0iZnIiPjwvU1BBTj48U1BBTiBMQU5HPSJmciI+PC9TUEFOPjxTUEFOIExBTkc9ImZyIj48DQoJRk9OVCBTSVpFPTIgRkFDRT0iU3ltYm9sIj4mIzE4Mzs8Rk9OVCBGQUNFPSJDb3VyaWVyIE5ldyI+Jm5ic3A7Jm5ic3A7Jm4NCglic3A7Jm5ic3A7Jm5ic3A7Jm5ic3A7PC9GT05UPjwvRk9OVD48L1NQQU4+PFNQQU4gTEFORz0iZnIiPjwvU1BBTj48U1BBDQoJTiBMQU5HPSJmciI+PC9TUEFOPjxTUEFOIExBTkc9ImZyIj48L1NQQU4+PFNQQU4gTEFORz0iZnIiPjwvU1BBTj48U1BBTiBMQU4NCglHPSJmciI+IDxGT05UIFNJWkU9MiBGQUNFPSJBcmlhbCI+ZGVwdWlzIElOVFJBTkVUIDo8L0ZPTlQ+PC9TUEFOPjxTUEFOIExBTg0KCUc9ImZyIj4gPC9TUEFOPjxBIEhSRUY9Imh0dHBzOi8vbW9uc2kuc3NvLmZyYW5jZXRlbGVjb20uZnIvaW5kZXguYXNwP3RhcmdlDQoJdD1IVFRQJTNBJTJGJTJGY29vcG5ldC5zc28uZnJhbmNldGVsZWNvbS5mciUyRkRlZmF1bHQuYXNweCUzZlJldHVyblVybCUzZCUNCgkyNTJmRGlyZWN0QWNjZXNzJTI1MmZTdGFydENvbmZlcmVuY2VCeVVybC5hc3B4JTI1M2ZjcElkJTI1M2RGRDA3MTlGNi1ERTdFLQ0KCTRBRTctOUE0OC1GMDJBNjY1NDE2QkUiPjxTUEFOIExBTkc9ImZyIj48L1NQQU4+PFNQQU4gTEFORz0iZnIiPjwvU1BBTj48U1BBDQoJTiBMQU5HPSJmciI+PFU+PC9VPjwvU1BBTj48VT48U1BBTiBMQU5HPSJmciI+PEZPTlQgQ09MT1I9IiMwMDAwRkYiIFNJWkU9MiANCglGQUNFPSJBcmlhbCI+Y2xpcXVleiBpY2k8L0ZPTlQ+PC9TUEFOPjwvVT48U1BBTiBMQU5HPSJmciI+PC9TUEFOPjwvQT48U1BBTg0KCSBMQU5HPSJmciI+PC9TUEFOPjxTUEFOIExBTkc9ImZyIj48L1NQQU4+PFNQQU4gTEFORz0iZnIiPjwvU1BBTj48U1BBTiBMQU5HDQoJPSJmciI+PEZPTlQgU0laRT0yIEZBQ0U9IkFyaWFsIj4gPC9GT05UPjwvU1BBTj48L1A+bm48UCBESVI9TFRSPjxTUEFOIExBDQoJTkc9ImZyIj48L1NQQU4+PFNQQU4gTEFORz0iZnIiPjwvU1BBTj48U1BBTiBMQU5HPSJmciI+PEZPTlQgU0laRT0yIEZBQ0U9IlMNCgl5bWJvbCI+JiMxODM7PEZPTlQgRkFDRT0iQ291cmllciBOZXciPiZuYnNwOyZuYnNwOyZuYnNwOyZuYnNwOyZuYnNwOw0KCSZuYnNwOzwvRk9OVD48L0ZPTlQ+PC9TUEFOPjxTUEFOIExBTkc9ImZyIj4gPEZPTlQgU0laRT0yIEZBQ0U9IkFyaWFsIj5kZXANCgl1aXMgSU5URVJORVQgOjwvRk9OVD48L1NQQU4+PFNQQU4gTEFORz0iZnIiPiA8L1NQQU4+PEEgSFJFRj0iaHR0cHM6Ly9jb29wbg0KCWV0Lm11bHRpbWVkaWEtY29uZmVyZW5jZS5vcmFuZ2UtYnVzaW5lc3MuY29tL0RpcmVjdEFjY2Vzcy9TdGFydENvbmZlcmVuY2VCDQoJeVVybC5hc3B4P2NwSWQ9RkQwNzE5RjYtREU3RS00QUU3LTlBNDgtRjAyQTY2NTQxNkJFIj48U1BBTiBMQU5HPSJmciI+PC9TUEENCglOPjxTUEFOIExBTkc9ImZyIj48L1NQQU4+PFNQQU4gTEFORz0iZnIiPjxVPjwvVT48L1NQQU4+PFU+PFNQQU4gTEFORz0iZnIiPg0KCTxGT05UIENPTE9SPSIjMDAwMEZGIiBTSVpFPTIgRkFDRT0iQXJpYWwiPmNsaXF1ZXogaWNpPC9GT05UPjwvU1BBTj48L1U+PFNQDQoJQU4gTEFORz0iZnIiPjwvU1BBTj48L0E+PFNQQU4gTEFORz0iZnIiPjwvU1BBTj48U1BBTiBMQU5HPSJmciI+PC9TUEFOPjxTUEENCglOIExBTkc9ImZyIj48L1NQQU4+PFNQQU4gTEFORz0iZnIiPjxGT05UIFNJWkU9MiBGQUNFPSJBcmlhbCI+IDwvRk9OVD48L1NQQQ0KCU4+PC9QPm5uPFAgRElSPUxUUj48U1BBTiBMQU5HPSJmciI+PC9TUEFOPjxTUEFOIExBTkc9ImZyIj48L1NQQU4+PFNQQU4gTA0KCUFORz0iZnIiPjwvU1BBTj48L1A+bm48L0JPRFk+bjwvSFRNTD4NClgtTUlDUk9TT0ZULUNETy1CVVNZU1RBVFVTOlRFTlRBVElWRQ0KWC1NSUNST1NPRlQtQ0RPLUlNUE9SVEFOQ0U6MQ0KWC1NSUNST1NPRlQtRElTQUxMT1ctQ09VTlRFUjpGQUxTRQ0KWC1NUy1PTEstQVBQVExBU1RTRVFVRU5DRTowDQpYLU1TLU9MSy1DT05GVFlQRTowDQpFTkQ6VkVWRU5UDQpCRUdJTjpWRVZFTlQNCkNMQVNTOlBVQkxJQw0KQ1JFQVRFRDoyMDE0MDQyNVQyMTE2MjBaDQpERVNDUklQVElPTjpMZSBsb3VwIGF1cmEgdC1pbCB1biBmZXN0aW4gZGFucyBsYSBtaW51dGUgPyBuDQpEVEVORDtUWklEPSJSb21hbmNlIFN0YW5kYXJkIFRpbWUiOjIwMTQwNDI3VDExMzAwMA0KRFRTVEFNUDoyMDE0MDQyNVQyMTI1MTlaDQpEVFNUQVJUO1RaSUQ9IlJvbWFuY2UgU3RhbmRhcmQgVGltZSI6MjAxNDA0MjdUMTAzMDAwDQpMQVNULU1PRElGSUVEOjIwMTQwNDI1VDIxMjEyN1oNCkxPQ0FUSU9OOm1haXNvbiBkZXMgdHJvaXMgcGV0aXRzIGNvY2hvbnMgDQpQUklPUklUWTo1DQpTRVFVRU5DRTowDQpTVU1NQVJZO0xBTkdVQUdFPWZyOnRlc3QgMQ0KVFJBTlNQOk9QQVFVRQ0KVUlEOjA0MDAwMDAwODIwMEUwMDA3NEM1QjcxMDFBODJFMDA4MDAwMDAwMDBCMEZCRThEOURDNjBDRjAxMDAwMDAwMDAwMDAwMDAwDQoJMDEwMDAwMDAwRjdCRjU3REJCQTg5MEM0NUI4ODc4QTMxMjE1N0ZEOTANClgtQUxULURFU0M7Rk1UVFlQRT10ZXh0L2h0bWw6PCFET0NUWVBFIEhUTUwgUFVCTElDICItLy9XM0MvL0RURCBIVE1MIDMuMi8vRQ0KCU4iPm48SFRNTD5uPEhFQUQ+bjxNRVRBIE5BTUU9IkdlbmVyYXRvciIgQ09OVEVOVD0iTVMgRXhjaGFuZ2UgU2VydmVyIHZlDQoJcnNpb24gMTQuMDIuNTAwNC4wMDAiPm48VElUTEU+PC9USVRMRT5uPC9IRUFEPm48Qk9EWT5uPCEtLSBDb252ZXJ0ZWQgZg0KCXJvbSB0ZXh0L3J0ZiBmb3JtYXQgLS0+bm48UCBESVI9TFRSPjxTUEFOIExBTkc9ImZyIj48L1NQQU4+PFNQQU4gTEFORz0iZg0KCXIiPjwvU1BBTj48U1BBTiBMQU5HPSJmciI+PEZPTlQgU0laRT0yIEZBQ0U9IkFyaWFsIj5MZSBsb3VwIGF1cmEgdC1pbCB1biBmDQoJZXN0aW7CoGRhbnMgbGEgbWludXRlID88L0ZPTlQ+PC9TUEFOPjxTUEFOIExBTkc9ImZyIj48L1NQQU4+PFNQQU4gTEFORz0iZnINCgkiPjwvU1BBTj48U1BBTiBMQU5HPSJmciI+IDwvU1BBTj48L1A+bm48L0JPRFk+bjwvSFRNTD4NClgtTUlDUk9TT0ZULUNETy1CVVNZU1RBVFVTOkJVU1kNClgtTUlDUk9TT0ZULUNETy1JTVBPUlRBTkNFOjENClgtTUlDUk9TT0ZULURJU0FMTE9XLUNPVU5URVI6RkFMU0UNClgtTVMtT0xLLUFVVE9GSUxMTE9DQVRJT046RkFMU0UNClgtTVMtT0xLLUNPTkZUWVBFOjANCkJFR0lOOlZBTEFSTQ0KVFJJR0dFUjotUFQzME0NCkFDVElPTjpESVNQTEFZDQpERVNDUklQVElPTjpSZW1pbmRlcg0KRU5EOlZBTEFSTQ0KRU5EOlZFVkVOVA0KQkVHSU46VkVWRU5UDQpDTEFTUzpQVUJMSUMNCkNSRUFURUQ6MjAxNDA0MjVUMjExOTU2Wg0KREVTQ1JJUFRJT046TGUgbG91cCBtYW5nZXJhLXQtaWwgdW4gZGVzIGNvY2hvbnMgZGFucyBs4oCZaGV1cmUgP24NCkRURU5EO1RaSUQ9IlJvbWFuY2UgU3RhbmRhcmQgVGltZSI6MjAxNDA0MjdUMTgzMDAwDQpEVFNUQU1QOjIwMTQwNDI1VDIxMjUxOVoNCkRUU1RBUlQ7VFpJRD0iUm9tYW5jZSBTdGFuZGFyZCBUaW1lIjoyMDE0MDQyN1QxODAwMDANCkxBU1QtTU9ESUZJRUQ6MjAxNDA0MjVUMjExOTU2Wg0KTE9DQVRJT046bWFpc29uIGRlcyB0cm9pcyBwZXRpdHMgY29jaG9ucyANClBSSU9SSVRZOjUNClNFUVVFTkNFOjANClNVTU1BUlk7TEFOR1VBR0U9ZnI6dGVzdCAyDQpUUkFOU1A6T1BBUVVFDQpVSUQ6MDQwMDAwMDA4MjAwRTAwMDc0QzVCNzEwMUE4MkUwMDgwMDAwMDAwMEYwM0U4OEZEREM2MENGMDEwMDAwMDAwMDAwMDAwMDANCgkwMTAwMDAwMDBEOTkyOEJDNzlDMTRGQTRBOEM2MjFFQ0E0RDk4MjUzMQ0KWC1BTFQtREVTQztGTVRUWVBFPXRleHQvaHRtbDo8IURPQ1RZUEUgSFRNTCBQVUJMSUMgIi0vL1czQy8vRFREIEhUTUwgMy4yLy9FDQoJTiI+bjxIVE1MPm48SEVBRD5uPE1FVEEgTkFNRT0iR2VuZXJhdG9yIiBDT05URU5UPSJNUyBFeGNoYW5nZSBTZXJ2ZXIgdmUNCglyc2lvbiAxNC4wMi41MDA0LjAwMCI+bjxUSVRMRT48L1RJVExFPm48L0hFQUQ+bjxCT0RZPm48IS0tIENvbnZlcnRlZCBmDQoJcm9tIHRleHQvcnRmIGZvcm1hdCAtLT5ubjxQIERJUj1MVFI+PFNQQU4gTEFORz0iZnIiPjwvU1BBTj48U1BBTiBMQU5HPSJmDQoJciI+PC9TUEFOPjxTUEFOIExBTkc9ImZyIj48Rk9OVCBTSVpFPTIgRkFDRT0iQXJpYWwiPkxlIGxvdXAgbWFuZ2VyYS10LWlsIHUNCgluIGRlcyBjb2Nob25zIGRhbnMgbOKAmWhldXJlwqA/PC9GT05UPjwvU1BBTj48U1BBTiBMQU5HPSJmciI+PC9TUEFOPjxTUEFOIA0KCUxBTkc9ImZyIj48L1NQQU4+PFNQQU4gTEFORz0iZnIiPjwvU1BBTj48L1A+bm48L0JPRFk+bjwvSFRNTD4NClgtTUlDUk9TT0ZULUNETy1CVVNZU1RBVFVTOkJVU1kNClgtTUlDUk9TT0ZULUNETy1JTVBPUlRBTkNFOjENClgtTUlDUk9TT0ZULURJU0FMTE9XLUNPVU5URVI6RkFMU0UNClgtTVMtT0xLLUFVVE9GSUxMTE9DQVRJT046RkFMU0UNClgtTVMtT0xLLUNPTkZUWVBFOjANCkJFR0lOOlZBTEFSTQ0KVFJJR0dFUjotUFQ2ME0NCkFDVElPTjpESVNQTEFZDQpERVNDUklQVElPTjpSZW1pbmRlcg0KRU5EOlZBTEFSTQ0KRU5EOlZFVkVOVA0KQkVHSU46VkVWRU5UDQpDTEFTUzpQVUJMSUMNCkNSRUFURUQ6MjAxNDA0MjVUMjEyMTMyWg0KREVTQ1JJUFRJT046bg0KRFRFTkQ7VFpJRD0iUm9tYW5jZSBTdGFuZGFyZCBUaW1lIjoyMDE0MDQyN1QxODAwMDANCkRUU1RBTVA6MjAxNDA0MjVUMjEyNTE5Wg0KRFRTVEFSVDtUWklEPSJSb21hbmNlIFN0YW5kYXJkIFRpbWUiOjIwMTQwNDI3VDE3MzAwMA0KTEFTVC1NT0RJRklFRDoyMDE0MDQyNVQyMTIxMzJaDQpQUklPUklUWTo1DQpTRVFVRU5DRTowDQpTVU1NQVJZO0xBTkdVQUdFPWZyOg0KVFJBTlNQOk9QQVFVRQ0KVUlEOjA0MDAwMDAwODIwMEUwMDA3NEM1QjcxMDFBODJFMDA4MDAwMDAwMDA4MDZCNjgzOERENjBDRjAxMDAwMDAwMDAwMDAwMDAwDQoJMDEwMDAwMDAwQjMyMjQ5NUE0NDUxMkI0MTg2MjFBODI3OEJEMUY0RTYNClgtQUxULURFU0M7Rk1UVFlQRT10ZXh0L2h0bWw6PCFET0NUWVBFIEhUTUwgUFVCTElDICItLy9XM0MvL0RURCBIVE1MIDMuMi8vRQ0KCU4iPm48SFRNTD5uPEhFQUQ+bjxNRVRBIE5BTUU9IkdlbmVyYXRvciIgQ09OVEVOVD0iTVMgRXhjaGFuZ2UgU2VydmVyIHZlDQoJcnNpb24gMTQuMDIuNTAwNC4wMDAiPm48VElUTEU+PC9USVRMRT5uPC9IRUFEPm48Qk9EWT5uPCEtLSBDb252ZXJ0ZWQgZg0KCXJvbSB0ZXh0L3J0ZiBmb3JtYXQgLS0+bm48UCBESVI9TFRSPjxTUEFOIExBTkc9ImZyIj48L1NQQU4+PFNQQU4gTEFORz0iZg0KCXIiPjwvU1BBTj48U1BBTiBMQU5HPSJmciI+PC9TUEFOPjwvUD5ubjwvQk9EWT5uPC9IVE1MPg0KWC1NSUNST1NPRlQtQ0RPLUJVU1lTVEFUVVM6QlVTWQ0KWC1NSUNST1NPRlQtQ0RPLUlNUE9SVEFOQ0U6MQ0KWC1NSUNST1NPRlQtRElTQUxMT1ctQ09VTlRFUjpGQUxTRQ0KWC1NUy1PTEstQVVUT0ZJTExMT0NBVElPTjpUUlVFDQpYLU1TLU9MSy1DT05GVFlQRTowDQpCRUdJTjpWQUxBUk0NClRSSUdHRVI6LVBUMTVNDQpBQ1RJT046RElTUExBWQ0KREVTQ1JJUFRJT046UmVtaW5kZXINCkVORDpWQUxBUk0NCkVORDpWRVZFTlQNCkJFR0lOOlZFVkVOVA0KQ0xBU1M6UFVCTElDDQpDUkVBVEVEOjIwMTQwNDI1VDIxMjI1OFoNCkRFU0NSSVBUSU9OOkxlIGxvdXAgbWFuZ2VyYSB0LWlsIGRhbnMgbOKAmWhldXJlID9uDQpEVEVORDtUWklEPSJSb21hbmNlIFN0YW5kYXJkIFRpbWUiOjIwMTQwNDI3VDEyMzAwMA0KRFRTVEFNUDoyMDE0MDQyNVQyMTI1MTlaDQpEVFNUQVJUO1RaSUQ9IlJvbWFuY2UgU3RhbmRhcmQgVGltZSI6MjAxNDA0MjdUMTIwMDAwDQpMQVNULU1PRElGSUVEOjIwMTQwNDI1VDIxMjI1OFoNCkxPQ0FUSU9OOm1haXNvbiBkZXMgdHJvaXMgcGV0aXRzIGNvY2hvbnMgDQpQUklPUklUWTo1DQpTRVFVRU5DRTowDQpTVU1NQVJZO0xBTkdVQUdFPWZyOnRlc3QgMg0KVFJBTlNQOk9QQVFVRQ0KVUlEOjA0MDAwMDAwODIwMEUwMDA3NEM1QjcxMDFBODJFMDA4MDAwMDAwMDA4MDlBRkM2MERENjBDRjAxMDAwMDAwMDAwMDAwMDAwDQoJMDEwMDAwMDAwQTJDRjMyRUUxQkIyNEE0QjlEQjY0QjE4OEI2MDI1MTENClgtQUxULURFU0M7Rk1UVFlQRT10ZXh0L2h0bWw6PCFET0NUWVBFIEhUTUwgUFVCTElDICItLy9XM0MvL0RURCBIVE1MIDMuMi8vRQ0KCU4iPm48SFRNTD5uPEhFQUQ+bjxNRVRBIE5BTUU9IkdlbmVyYXRvciIgQ09OVEVOVD0iTVMgRXhjaGFuZ2UgU2VydmVyIHZlDQoJcnNpb24gMTQuMDIuNTAwNC4wMDAiPm48VElUTEU+PC9USVRMRT5uPC9IRUFEPm48Qk9EWT5uPCEtLSBDb252ZXJ0ZWQgZg0KCXJvbSB0ZXh0L3J0ZiBmb3JtYXQgLS0+bm48UCBESVI9TFRSPjxTUEFOIExBTkc9ImZyIj48L1NQQU4+PFNQQU4gTEFORz0iZg0KCXIiPjwvU1BBTj48U1BBTiBMQU5HPSJmciI+PEZPTlQgU0laRT0yIEZBQ0U9IkFyaWFsIj5MZSBsb3VwIG1hbmdlcmEgdC1pbCBkDQoJYW5zIGzigJloZXVyZcKgPzwvRk9OVD48L1NQQU4+PFNQQU4gTEFORz0iZnIiPjwvU1BBTj48U1BBTiBMQU5HPSJmciI+PC9TUEENCglOPjxTUEFOIExBTkc9ImZyIj48L1NQQU4+PC9QPm5uPC9CT0RZPm48L0hUTUw+DQpYLU1JQ1JPU09GVC1DRE8tQlVTWVNUQVRVUzpCVVNZDQpYLU1JQ1JPU09GVC1DRE8tSU1QT1JUQU5DRToxDQpYLU1JQ1JPU09GVC1ESVNBTExPVy1DT1VOVEVSOkZBTFNFDQpYLU1TLU9MSy1BVVRPRklMTExPQ0FUSU9OOkZBTFNFDQpYLU1TLU9MSy1DT05GVFlQRTowDQpCRUdJTjpWQUxBUk0NClRSSUdHRVI6LVBUNjBNDQpBQ1RJT046RElTUExBWQ0KREVTQ1JJUFRJT046UmVtaW5kZXINCkVORDpWQUxBUk0NCkVORDpWRVZFTlQNCkJFR0lOOlZFVkVOVA0KQ0xBU1M6UFVCTElDDQpDUkVBVEVEOjIwMTQwNDI1VDIxMjMzN1oNCkRFU0NSSVBUSU9OOkxlIGxvdXAgbWFuZ2VyYSB0LWlsIGxhIHNlbWFpbmUgcHJvY2hhaW5lID9uDQpEVEVORDtUWklEPSJSb21hbmNlIFN0YW5kYXJkIFRpbWUiOjIwMTQwNTA0VDEyMzAwMA0KRFRTVEFNUDoyMDE0MDQyNVQyMTI1MTlaDQpEVFNUQVJUO1RaSUQ9IlJvbWFuY2UgU3RhbmRhcmQgVGltZSI6MjAxNDA1MDRUMTIwMDAwDQpMQVNULU1PRElGSUVEOjIwMTQwNDI1VDIxMjMzN1oNCkxPQ0FUSU9OOm1haXNvbiBkZXMgdHJvaXMgcGV0aXRzIGNvY2hvbnMgDQpQUklPUklUWTo1DQpTRVFVRU5DRTowDQpTVU1NQVJZO0xBTkdVQUdFPWZyOnRlc3QgMw0KVFJBTlNQOk9QQVFVRQ0KVUlEOjA0MDAwMDAwODIwMEUwMDA3NEM1QjcxMDFBODJFMDA4MDAwMDAwMDBBMERBMDM3Q0RENjBDRjAxMDAwMDAwMDAwMDAwMDAwDQoJMDEwMDAwMDAwMTIyRjY4RjA5NkRGMUE0NTk1MjdFMkEzN0IzODc5OEQNClgtQUxULURFU0M7Rk1UVFlQRT10ZXh0L2h0bWw6PCFET0NUWVBFIEhUTUwgUFVCTElDICItLy9XM0MvL0RURCBIVE1MIDMuMi8vRQ0KCU4iPm48SFRNTD5uPEhFQUQ+bjxNRVRBIE5BTUU9IkdlbmVyYXRvciIgQ09OVEVOVD0iTVMgRXhjaGFuZ2UgU2VydmVyIHZlDQoJcnNpb24gMTQuMDIuNTAwNC4wMDAiPm48VElUTEU+PC9USVRMRT5uPC9IRUFEPm48Qk9EWT5uPCEtLSBDb252ZXJ0ZWQgZg0KCXJvbSB0ZXh0L3J0ZiBmb3JtYXQgLS0+bm48UCBESVI9TFRSPjxTUEFOIExBTkc9ImZyIj48L1NQQU4+PFNQQU4gTEFORz0iZg0KCXIiPjwvU1BBTj48U1BBTiBMQU5HPSJmciI+PEZPTlQgU0laRT0yIEZBQ0U9IkFyaWFsIj5MZSBsb3VwIG1hbmdlcmEgdC1pbCBsDQoJYSBzZW1haW5lIHByb2NoYWluZcKgPzwvRk9OVD48L1NQQU4+PFNQQU4gTEFORz0iZnIiPjwvU1BBTj48U1BBTiBMQU5HPSJmciINCgk+PC9TUEFOPjxTUEFOIExBTkc9ImZyIj48L1NQQU4+PC9QPm5uPC9CT0RZPm48L0hUTUw+DQpYLU1JQ1JPU09GVC1DRE8tQlVTWVNUQVRVUzpCVVNZDQpYLU1JQ1JPU09GVC1DRE8tSU1QT1JUQU5DRToxDQpYLU1JQ1JPU09GVC1ESVNBTExPVy1DT1VOVEVSOkZBTFNFDQpYLU1TLU9MSy1BVVRPRklMTExPQ0FUSU9OOkZBTFNFDQpYLU1TLU9MSy1DT05GVFlQRTowDQpCRUdJTjpWQUxBUk0NClRSSUdHRVI6LVBUMTQ0ME0NCkFDVElPTjpESVNQTEFZDQpERVNDUklQVElPTjpSZW1pbmRlcg0KRU5EOlZBTEFSTQ0KRU5EOlZFVkVOVA0KRU5EOlZDQUxFTkRBUg==";
	  var decodedData = window.atob(encodedData);

	  icalParser.parseIcal(decodedData);
	  //icalParser.ical is now set
	  icalParser.ical.version;
	  icalParser.ical.prodid;

	    var startDate;
		var startTime;
		var endDate;
		var endTime;
		var dstampDate;
		var dstampTime;
		var uid=''
		var trigger='';
		var action='';
		var location='';
		var summary='';
		var description='';

		for(var key in icalParser.ical.events)
	 {
         console.log("------");
		 console.log("Event N?"+key+ " : ");

	    if (icalParser.ical.events[key].dtstart==null || icalParser.ical.events[key]=== undefined || icalParser.ical.events[key].dtstart=== undefined)  console.log("description  null/undefined" );
 		else{
			console.log("DSTART VALUE : " +icalParser.ical.events[key].dtstart['value']);
			startDate=ParseICSDate(icalParser.ical.events[key].dtstart['value'],'date');
			startTime=ParseICSDate(icalParser.ical.events[key].dtstart['value'],'time');
			console.log(startDate);
			console.log(startTime);
		}

		if (icalParser.ical.events[key].dtend==null || icalParser.ical.events[key]=== undefined || icalParser.ical.events[key].dtend=== undefined)  console.log("description  null/undefined" );
		else
		{
			console.log("DTEND VALUE : " +icalParser.ical.events[key].dtend['value']);
			endDate=ParseICSDate(icalParser.ical.events[key].dtend['value'],'date');
			endTime=ParseICSDate(icalParser.ical.events[key].dtend['value'],'time');
			console.log(endTime);
			console.log(endDate);
		}

		if (icalParser.ical.events[key].uid==null || icalParser.ical.events[key]=== undefined || icalParser.ical.events[key].uid=== undefined)  console.log("description  null/undefined" );
		else
		{
			uid = icalParser.ical.events[key].uid['value'];
			console.log("UID VALUE : " +icalParser.ical.events[key].uid['value']);
		}

		if (icalParser.ical.events[key].description==null || icalParser.ical.events[key]=== undefined || icalParser.ical.events[key].description=== undefined)  console.log("description  null/undefined" );
		else
		{
			description = icalParser.ical.events[key].description['value'];
			console.log("Descritpion VALUE : " +icalParser.ical.events[key].description['value']);
		}

		if (icalParser.ical.events[key].trigger==null || icalParser.ical.events[key]=== undefined || icalParser.ical.events[key].trigger=== undefined)  console.log("trigger  null/undefined" );
		else
		{
			trigger = icalParser.ical.events[key].trigger['value'];
			console.log("Trigger VALUE : " +icalParser.ical.events[key].trigger['value']);
		}

		if (icalParser.ical.events[key].action==null || icalParser.ical.events[key]=== undefined || icalParser.ical.events[key].action=== undefined)  console.log("action  null/undefined" );
		else
		{
			action = icalParser.ical.events[key].action['value'];
			console.log("Action VALUE : " +icalParser.ical.events[key].action['value']);
		}

		if (icalParser.ical.events[key].location==null || icalParser.ical.events[key]=== undefined || icalParser.ical.events[key].location=== undefined)  console.log("location  null/undefined" );
		else
		{
			console.log("Location VALUE : " +icalParser.ical.events[key].location['value']);
			location=icalParser.ical.events[key].location['value'];
		}

		if (icalParser.ical.events[key].summary==null || icalParser.ical.events[key]=== undefined || icalParser.ical.events[key].summary=== undefined)  console.log("summary  null/undefined" );
		else
		{
			console.log("Summary VALUE : " +icalParser.ical.events[key].summary['value']);
			summary=icalParser.ical.events[key].summary['value'];
		}

        console.log("------");


	 if (icalParser.ical.events[key].action==null || icalParser.ical.events[key]=== undefined || icalParser.ical.events[key].action=== undefined)  console.log("action  null/undefined" );
		else
		{
	 //enregistrement des alarms
	 var template = Calendar.Templates.Alarm;
      var alarms = [];

	  alarms.push({
            trigger: trigger
          });

	 this.alarmList.innerHTML = template.picker.renderEach(alarms).join('');

	 }

	}


	 var data = formICSdata(summary, location, description ,startDate, startTime,endDate, endTime ,action ,trigger) ;

	 var errors;
      var self = this;
      var provider;

      this.store.providerFor(this.event, fetchProvider);

      function fetchProvider(err, result) {
        provider = result;
        provider.eventCapabilities(
          self.event.data,
          verifyCaps
        );
      }

      function verifyCaps(err, caps) {
        if (err) {
          console.log('Error fetching capabilities for', self.event);
          return;
        }

        // safe-guard but should not ever happen.
        if (caps[capability]) {
          persistEventICScheck();
        }
      }

	  function formatInputDate(date, time)
	{
		var new_date = date.split("-");
		var new_hour = time.split(":");
		return new Date(new_date[0], new_date[1], new_date[2], new_hour[0], new_hour[1], new_hour[2]);
	}

	function formICSdata(arg_summary,arg_location,arg_description,arg_dstartDate, arg_dstartTime,arg_dtendDate, arg_dtendTime ,arg_action,arg_trigger)
	{
      var fields = {
        title: arg_summary,
        location: arg_location,
        description: arg_description,
        calendarId: "local-first"
      };

      var startTime = arg_dstartTime;
      var endTime = arg_dtendTime;

      fields.startDate = formatInputDate(arg_dstartDate, startTime);
      fields.endDate =	formatInputDate(arg_dtendDate, endTime);

        fields.alarms = [];
        fields.alarms.push(
        {
            action: arg_action,
            trigger: arg_trigger
        });
        return fields;
    }
	function ParseICSDate(icsDate, type){
		 //type : time/date

		var year=0;
		var month=0;
		var day=0;
		var hour=0;
		var mins=0;
		var sec=0;

		//date building YYYY-MM-DD
		if(type=='date'){
		var year=icsDate.substring(0,4);
		var month=icsDate.substring(4,6);
		var day=icsDate.substring(6,8);

		var icsDate = year+"-"+month+"-"+day;

		//time building hh:mm:ss Dont forget the "T" char in the middle
		}else{

		var hour=icsDate.substring(9,11);
		var mins=icsDate.substring(11,13);
		var sec=icsDate.substring(13,15);

		var icsDate = hour+":"+mins+":"+sec;

		}
			return icsDate;
	}



    function persistEventICScheck() {

        var list = self.element.classList;

        // mark view as 'in progress' so we can style
        // it via css during that time period
        list.add(self.PROGRESS);

        var moveDate = self.event.startDate;

        provider[method](self.event.data, function(err) {
          list.remove(self.PROGRESS);

          if (err) {
            self.showErrors(err);
            return;
          }

          // move the position in the calendar to the added/edited day
          self.app.timeController.move(moveDate);
          // order is important the above method triggers the building
          // of the dom elements so selectedDay must come after.
          self.app.timeController.selectedDay = moveDate;
          self.app.go(self.returnTo());
        });
      }
  },

  _form_dataICS:function(){

	  function Icstotab(elem)
	  {
		  var encodedData= "QkVHSU46VkNBTEVOREFSDQpQUk9ESUQ6LS8vTWljcm9zb2Z0IENvcnBvcmF0aW9uLy9PdXRsb29rIDE0LjAgTUlNRURJUi8vRU4NClZFUlNJT046Mi4wDQpNRVRIT0Q6UFVCTElTSA0KWC1DQUxTVEFSVDoyMDEzMDkxNlQwODAwMDBaDQpYLUNBTEVORDoyMDE0MDUyM1QxMjAwMDBaDQpYLVdSLVJFTENBTElEOnswMDAwMDAyRS04QkU0LTUyRUYtNzE1RS0yQkJEMDE1MzkyRDN9DQpYLVdSLUNBTE5BTUU6TEFWQUJSRSBDbMOpbWVudCBPRi9EU0lGDQpYLVBSSU1BUlktQ0FMRU5EQVI6VFJVRQ0KWC1PV05FUjtDTj0iTEFWQUJSRSBDbMOpbWVudCBPRi9EU0lGIjptYWlsdG86Y2xlbWVudC5sYXZhYnJlQG9yYW5nZS5jb20NClgtTVMtT0xLLVdLSFJTVEFSVDtUWklEPSJSb21hbmNlIFN0YW5kYXJkIFRpbWUiOjA4MDAwMA0KWC1NUy1PTEstV0tIUkVORDtUWklEPSJSb21hbmNlIFN0YW5kYXJkIFRpbWUiOjE3MDAwMA0KWC1NUy1PTEstV0tIUkRBWVM6TU8sVFUsV0UsVEgsRlINCkJFR0lOOlZUSU1FWk9ORQ0KVFpJRDpSb21hbmNlIFN0YW5kYXJkIFRpbWUNCkJFR0lOOlNUQU5EQVJEDQpEVFNUQVJUOjE2MDExMDI4VDAzMDAwMA0KUlJVTEU6RlJFUT1ZRUFSTFk7QllEQVk9LTFTVTtCWU1PTlRIPTEwDQpUWk9GRlNFVEZST006KzAyMDANClRaT0ZGU0VUVE86KzAxMDANCkVORDpTVEFOREFSRA0KQkVHSU46REFZTElHSFQNCkRUU1RBUlQ6MTYwMTAzMjVUMDIwMDAwDQpSUlVMRTpGUkVRPVlFQVJMWTtCWURBWT0tMVNVO0JZTU9OVEg9Mw0KVFpPRkZTRVRGUk9NOiswMTAwDQpUWk9GRlNFVFRPOiswMjAwDQpFTkQ6REFZTElHSFQNCkVORDpWVElNRVpPTkUNCkJFR0lOOlZFVkVOVA0KQ0xBU1M6UFVCTElDDQpDUkVBVEVEOjIwMTMwOTE2VDA3NTExMloNCkRFU0NSSVBUSU9OOlLDqXVuaW9uIA0KRFRFTkQ6MjAxMzA5MTZUMDkwMDAwWg0KRFRTVEFNUDoyMDEzMDkxM1QxMzI1MThaDQpEVFNUQVJUOjIwMTMwOTE2VDA4MDAwMFoNCkxBU1QtTU9ESUZJRUQ6MjAxMzA5MTZUMDc1MTEyWg0KTE9DQVRJT046U0RSIDk0M0ENClBSSU9SSVRZOjUNClNFUVVFTkNFOjANClNVTU1BUlk7TEFOR1VBR0U9ZnI6UsOpc2VydmF0aW9uIGRlIENsw6ltZW50IExhdmFicmUNClRSQU5TUDpPUEFRVUUNClVJRDoxMzc5MzE4NDAwMDAwMTM3OTMxODQwMDAwMDo4QGlwb3J0YQ0KWC1NSUNST1NPRlQtQ0RPLUJVU1lTVEFUVVM6QlVTWQ0KWC1NSUNST1NPRlQtQ0RPLUlNUE9SVEFOQ0U6MQ0KRU5EOlZFVkVOVA0KQkVHSU46VkVWRU5UDQpBVFRFTkRFRTtDTj0iQkVVWk9OIFNvbGVuZSBPRi9EU0lGIjtSU1ZQPVRSVUU7UEFSVFNUQVQ9VEVOVEFUSVZFOm1haWx0bzpzb2wNCgllbmUuYmV1em9uQG9yYW5nZS5jb20NCkFUVEVOREVFO0NOPSJGRU5BWVJPVSBBbm5lIEV4dCBPRi9EU0lGIjtSU1ZQPVRSVUU6bWFpbHRvOmFmZW5heXJvdS5leHRAb3Jhbg0KCWdlLmNvbQ0KQVRURU5ERUU7Q049IlZBTlNPTiBPbGl2aWVyIEV4dCBPRi9EU0lGIjtSU1ZQPVRSVUU6bWFpbHRvOm92YW5zb24uZXh0QG9yYW5nDQoJZS5jb20NCkFUVEVOREVFO0NOPSJUT0RPUk9WQSBBbmEgT0YvRFNJRiI7UlNWUD1UUlVFOm1haWx0bzphbmEudG9kb3JvdmFAb3JhbmdlLmNvbQ0KQVRURU5ERUU7Q049IkJSQU5EVCBBbGV4aXMgT0YvRFNJRiI7UlNWUD1UUlVFOm1haWx0bzphbGV4aXMuYnJhbmR0QG9yYW5nZS5jDQoJb20NCkFUVEVOREVFO0NOPSJHVUlMTEVNQVJEIExhdXJlbnQgT0YvRFNJRiI7UlNWUD1UUlVFOm1haWx0bzpsYXVyZW50Lmd1aWxsZW1hcg0KCWRAb3JhbmdlLmNvbQ0KQVRURU5ERUU7Q049IkJSRVRFQVVYIExpb25lbCBPRi9EU0lGIjtSU1ZQPVRSVUU7UEFSVFNUQVQ9VEVOVEFUSVZFOm1haWx0bzpsDQoJaW9uZWwxLmJyZXRlYXV4QG9yYW5nZS5jb20NCkFUVEVOREVFO0NOPSJLSE9VUEhPTkdTWSBBbGV4YW5kcmUgRXh0IE9GL0RTSUYiO1JTVlA9VFJVRTtQQVJUU1RBVD1BQ0NFUFRFRA0KCTptYWlsdG86YWtob3VwaG9uZ3N5LmV4dEBvcmFuZ2UuY29tDQpBVFRFTkRFRTtDTj0iWk9SREFOIFBoaWxpcHBlIE9GL0RTSUYiO1JTVlA9VFJVRTptYWlsdG86cGhpbGlwcGUuem9yZGFuQG9yYW4NCglnZS5jb20NCkFUVEVOREVFO0NOPSJMRSBCQU5TQUlTIE1hcmMgT0YvRFNJRiI7UlNWUD1UUlVFO1BBUlRTVEFUPVRFTlRBVElWRTptYWlsdG86bQ0KCWFyYy5sZWJhbnNhaXNAb3JhbmdlLmNvbQ0KQVRURU5ERUU7Q049IkFMR0VSIEdyw6lnb3J5IE9GL0RTSUYiO1JTVlA9VFJVRTptYWlsdG86Z3JlZ29yeS5hbGdlckBvcmFuZ2UuDQoJY29tDQpBVFRFTkRFRTtDTj0iWkFIUkFNQU5FIEhhc3NhbiBPRi9EU0lGIjtSU1ZQPVRSVUU6bWFpbHRvOmhhc3Nhbi56YWhyYW1hbmVAb3INCglhbmdlLmNvbQ0KQVRURU5ERUU7Q049IkJFTE9VQkFEIE15cmlhbSBFeHQgT0YvRFNJRiI7UlNWUD1UUlVFO1BBUlRTVEFUPVRFTlRBVElWRTptYWlsDQoJdG86bWJlbG91YmFkLmV4dEBvcmFuZ2UuY29tDQpBVFRFTkRFRTtDTj0iUE9JUk9UIEplYW4gRGF2aWQgT0YvRFNJRiI7UlNWUD1UUlVFO1BBUlRTVEFUPUFDQ0VQVEVEOm1haWx0bzoNCglqZWFuZGF2aWQucG9pcm90QG9yYW5nZS5jb20NCkNMQVNTOlBVQkxJQw0KQ1JFQVRFRDoyMDE0MDMxOVQxMzI3MjFaDQpERVNDUklQVElPTjogbg0KRFRFTkQ7VFpJRD0iUm9tYW5jZSBTdGFuZGFyZCBUaW1lIjoyMDE0MDMyMVQxNDAwMDANCkRUU1RBTVA6MjAxNDAzMTlUMTM1MDQ4Wg0KRFRTVEFSVDtUWklEPSJSb21hbmNlIFN0YW5kYXJkIFRpbWUiOjIwMTQwMzIxVDEyMzAwMA0KTEFTVC1NT0RJRklFRDoyMDE0MDQyNVQyMTE5NTFaDQpMT0NBVElPTjpzYWxsZSBkZSByw6l1DQpPUkdBTklaRVI7Q049IkxBVkFCUkUgQ2zDqW1lbnQgT0YvRFNJRiI6bWFpbHRvOmNsZW1lbnQubGF2YWJyZUBvcmFuZ2UuY29tDQpQUklPUklUWTo1DQpSUlVMRTpGUkVRPVdFRUtMWTtDT1VOVD0xMDtCWURBWT1GUg0KU0VRVUVOQ0U6MA0KU1VNTUFSWTtMQU5HVUFHRT1mcjpCcmVhayBqZXV4IC0gY2l0YWRlbGxlLCBFbGl4aXIgLi4uIA0KVFJBTlNQOk9QQVFVRQ0KVUlEOjA0MDAwMDAwODIwMEUwMDA3NEM1QjcxMDFBODJFMDA4MDAwMDAwMDBCMDI4MzMyODgwNDNDRjAxMDAwMDAwMDAwMDAwMDAwDQoJMDEwMDAwMDAwQkI1Qjk5OEUzRkVGNTg0Qzg2QzI4MTI1NTExQzgwMUYNClgtQUxULURFU0M7Rk1UVFlQRT10ZXh0L2h0bWw6PCFET0NUWVBFIEhUTUwgUFVCTElDICItLy9XM0MvL0RURCBIVE1MIDMuMi8vRQ0KCU4iPm48SFRNTD5uPEhFQUQ+bjxNRVRBIE5BTUU9IkdlbmVyYXRvciIgQ09OVEVOVD0iTVMgRXhjaGFuZ2UgU2VydmVyIHZlDQoJcnNpb24gMTQuMDIuNTAwNC4wMDAiPm48VElUTEU+PC9USVRMRT5uPC9IRUFEPm48Qk9EWT5uPCEtLSBDb252ZXJ0ZWQgZg0KCXJvbSB0ZXh0L3J0ZiBmb3JtYXQgLS0+bm48UCBESVI9TFRSPjxTUEFOIExBTkc9ImZyIj48L1NQQU4+PFNQQU4gTEFORz0iZg0KCXIiPjwvU1BBTj48U1BBTiBMQU5HPSJmciI+PEZPTlQgU0laRT0yIEZBQ0U9IkFyaWFsIj48L0ZPTlQ+PC9TUEFOPjxTUEFOIExBDQoJTkc9ImZyIj48L1NQQU4+PFNQQU4gTEFORz0iZnIiPjwvU1BBTj48U1BBTiBMQU5HPSJmciI+Jm5ic3A7PC9TUEFOPjwvUD5uDQoJbjwvQk9EWT5uPC9IVE1MPg0KWC1NSUNST1NPRlQtQ0RPLUJVU1lTVEFUVVM6QlVTWQ0KWC1NSUNST1NPRlQtQ0RPLUlNUE9SVEFOQ0U6MQ0KWC1NSUNST1NPRlQtRElTQUxMT1ctQ09VTlRFUjpGQUxTRQ0KWC1NUy1PTEstQVBQVExBU1RTRVFVRU5DRToyDQpYLU1TLU9MSy1BUFBUU0VRVElNRToyMDE0MDMxOVQxMzUwNDhaDQpYLU1TLU9MSy1BVVRPRklMTExPQ0FUSU9OOkZBTFNFDQpYLU1TLU9MSy1DT05GVFlQRTowDQpCRUdJTjpWQUxBUk0NClRSSUdHRVI6LVBUMTVNDQpBQ1RJT046RElTUExBWQ0KREVTQ1JJUFRJT046UmVtaW5kZXINCkVORDpWQUxBUk0NCkVORDpWRVZFTlQNCkJFR0lOOlZFVkVOVA0KQ0xBU1M6UFVCTElDDQpDUkVBVEVEOjIwMTQwMzIxVDA5MTgzNVoNCkRFU0NSSVBUSU9OOkxhIHNhbGxlIGRlIHLDqXUgc2VyYSBsYSA5MjJBICAubg0KRFRFTkQ6MjAxNDAzMjFUMTMwMDAwWg0KRFRTVEFNUDoyMDE0MDMyMVQwOTQ4MTZaDQpEVFNUQVJUOjIwMTQwMzIxVDExMzAwMFoNCkxBU1QtTU9ESUZJRUQ6MjAxNDAzMjFUMDk0ODE2Wg0KTE9DQVRJT046c2FsbGUgZGUgcsOpdSA5MjINClBSSU9SSVRZOjUNClJFQ1VSUkVOQ0UtSUQ6MjAxNDAzMjFUMTEzMDAwWg0KU0VRVUVOQ0U6MQ0KVFJBTlNQOk9QQVFVRQ0KVUlEOjA0MDAwMDAwODIwMEUwMDA3NEM1QjcxMDFBODJFMDA4MDAwMDAwMDBCMDI4MzMyODgwNDNDRjAxMDAwMDAwMDAwMDAwMDAwDQoJMDEwMDAwMDAwQkI1Qjk5OEUzRkVGNTg0Qzg2QzI4MTI1NTExQzgwMUYNClgtQUxULURFU0M7Rk1UVFlQRT10ZXh0L2h0bWw6PCFET0NUWVBFIEhUTUwgUFVCTElDICItLy9XM0MvL0RURCBIVE1MIDMuMi8vRQ0KCU4iPm48SFRNTD5uPEhFQUQ+bjxNRVRBIE5BTUU9IkdlbmVyYXRvciIgQ09OVEVOVD0iTVMgRXhjaGFuZ2UgU2VydmVyIHZlDQoJcnNpb24gMTQuMDIuNTAwNC4wMDAiPm48VElUTEU+PC9USVRMRT5uPC9IRUFEPm48Qk9EWT5uPCEtLSBDb252ZXJ0ZWQgZg0KCXJvbSB0ZXh0L3J0ZiBmb3JtYXQgLS0+bm48UCBESVI9TFRSPjxTUEFOIExBTkc9ImZyIj48L1NQQU4+PFNQQU4gTEFORz0iZg0KCXIiPjwvU1BBTj48U1BBTiBMQU5HPSJmciI+PEZPTlQgU0laRT0yIEZBQ0U9IkFyaWFsIj5MYSBzYWxsZTwvRk9OVD48L1NQQU4+DQoJPFNQQU4gTEFORz0iZnIiPjwvU1BBTj48U1BBTiBMQU5HPSJmciI+PC9TUEFOPjxTUEFOIExBTkc9ImZyIj4gPEZPTlQgU0laRT0NCgkyIEZBQ0U9IkFyaWFsIj5kZSByw6l1PC9GT05UPjwvU1BBTj48U1BBTiBMQU5HPSJmciI+PC9TUEFOPjxTUEFOIExBTkc9ImZyIg0KCT48L1NQQU4+PFNQQU4gTEFORz0iZnIiPiA8Rk9OVCBTSVpFPTIgRkFDRT0iQXJpYWwiPnNlcmE8L0ZPTlQ+PC9TUEFOPjxTUEFODQoJIExBTkc9ImZyIj48L1NQQU4+PFNQQU4gTEFORz0iZnIiPjwvU1BBTj48U1BBTiBMQU5HPSJmciI+PEZPTlQgU0laRT0yIEZBQ0UNCgk9IkFyaWFsIj4gbGE8L0ZPTlQ+PC9TUEFOPjxTUEFOIExBTkc9ImZyIj48L1NQQU4+PFNQQU4gTEFORz0iZnIiPjwvU1BBTj48Uw0KCVBBTiBMQU5HPSJmciI+IDxGT05UIFNJWkU9MiBGQUNFPSJBcmlhbCI+OTIyQSZuYnNwOyAuPC9GT05UPjwvU1BBTj48U1BBTiANCglMQU5HPSJmciI+PC9TUEFOPjxTUEFOIExBTkc9ImZyIj48L1NQQU4+PFNQQU4gTEFORz0iZnIiPjwvU1BBTj48L1A+bm48L0INCglPRFk+bjwvSFRNTD4NClgtTUlDUk9TT0ZULUNETy1CVVNZU1RBVFVTOkJVU1kNClgtTUlDUk9TT0ZULUNETy1JTVBPUlRBTkNFOjENClgtTVMtT0xLLUFQUFRTRVFUSU1FOjIwMTQwMzIxVDA5NDgxNloNClgtTVMtT0xLLUFVVE9GSUxMTE9DQVRJT046RkFMU0UNCkJFR0lOOlZBTEFSTQ0KVFJJR0dFUjotUFQxNU0NCkFDVElPTjpESVNQTEFZDQpERVNDUklQVElPTjpSZW1pbmRlcg0KRU5EOlZBTEFSTQ0KRU5EOlZFVkVOVA0KQkVHSU46VkVWRU5UDQpDTEFTUzpQVUJMSUMNCkNSRUFURUQ6MjAxNDAzMjhUMTA0ODU4Wg0KRFRFTkQ6MjAxNDAzMjhUMTMwMDAwWg0KRFRTVEFNUDoyMDE0MDQyNVQyMTI1MTlaDQpEVFNUQVJUOjIwMTQwMzI4VDExMzAwMFoNCkxBU1QtTU9ESUZJRUQ6MjAxNDAzMjhUMTA0ODU4Wg0KUFJJT1JJVFk6NQ0KUkVDVVJSRU5DRS1JRDoyMDE0MDMyOFQxMTMwMDBaDQpTRVFVRU5DRTowDQpUUkFOU1A6T1BBUVVFDQpVSUQ6MDQwMDAwMDA4MjAwRTAwMDc0QzVCNzEwMUE4MkUwMDgwMDAwMDAwMEIwMjgzMzI4ODA0M0NGMDEwMDAwMDAwMDAwMDAwMDANCgkwMTAwMDAwMDBCQjVCOTk4RTNGRUY1ODRDODZDMjgxMjU1MTFDODAxRg0KWC1NSUNST1NPRlQtQ0RPLUJVU1lTVEFUVVM6QlVTWQ0KWC1NSUNST1NPRlQtQ0RPLUlNUE9SVEFOQ0U6MQ0KQkVHSU46VkFMQVJNDQpUUklHR0VSOi1QVDE1TQ0KQUNUSU9OOkRJU1BMQVkNCkRFU0NSSVBUSU9OOlJlbWluZGVyDQpFTkQ6VkFMQVJNDQpFTkQ6VkVWRU5UDQpCRUdJTjpWRVZFTlQNCkNMQVNTOlBVQkxJQw0KQ1JFQVRFRDoyMDE0MDQxMVQwODQzMjdaDQpEVEVORDoyMDE0MDQxMVQxMjAwMDBaDQpEVFNUQU1QOjIwMTQwNDExVDA4NDQ0MloNCkRUU1RBUlQ6MjAxNDA0MTFUMTAzMDAwWg0KTEFTVC1NT0RJRklFRDoyMDE0MDQxMVQwODQ3MjVaDQpQUklPUklUWTo1DQpSRUNVUlJFTkNFLUlEOjIwMTQwNDExVDEwMzAwMFoNClNFUVVFTkNFOjANClRSQU5TUDpPUEFRVUUNClVJRDowNDAwMDAwMDgyMDBFMDAwNzRDNUI3MTAxQTgyRTAwODAwMDAwMDAwQjAyODMzMjg4MDQzQ0YwMTAwMDAwMDAwMDAwMDAwMA0KCTAxMDAwMDAwMEJCNUI5OThFM0ZFRjU4NEM4NkMyODEyNTUxMUM4MDFGDQpYLU1JQ1JPU09GVC1DRE8tQlVTWVNUQVRVUzpCVVNZDQpYLU1JQ1JPU09GVC1DRE8tSU1QT1JUQU5DRToxDQpCRUdJTjpWQUxBUk0NClRSSUdHRVI6LVBUMTVNDQpBQ1RJT046RElTUExBWQ0KREVTQ1JJUFRJT046UmVtaW5kZXINCkVORDpWQUxBUk0NCkVORDpWRVZFTlQNCkJFR0lOOlZFVkVOVA0KQ0xBU1M6UFVCTElDDQpDUkVBVEVEOjIwMTQwNDE3VDEzNTQzNFoNCkRURU5EOjIwMTQwNDI1VDEyMDAwMFoNCkRUU1RBTVA6MjAxNDA0MjVUMjEyNTE5Wg0KRFRTVEFSVDoyMDE0MDQyNVQxMDMwMDBaDQpMQVNULU1PRElGSUVEOjIwMTQwNDI1VDA4MTgyMVoNClBSSU9SSVRZOjUNClJFQ1VSUkVOQ0UtSUQ6MjAxNDA0MjVUMTAzMDAwWg0KU0VRVUVOQ0U6MA0KVUlEOjA0MDAwMDAwODIwMEUwMDA3NEM1QjcxMDFBODJFMDA4MDAwMDAwMDBCMDI4MzMyODgwNDNDRjAxMDAwMDAwMDAwMDAwMDAwDQoJMDEwMDAwMDAwQkI1Qjk5OEUzRkVGNTg0Qzg2QzI4MTI1NTExQzgwMUYNClgtTUlDUk9TT0ZULUNETy1JTVBPUlRBTkNFOjENCkJFR0lOOlZBTEFSTQ0KVFJJR0dFUjotUFQxNU0NCkFDVElPTjpESVNQTEFZDQpERVNDUklQVElPTjpSZW1pbmRlcg0KRU5EOlZBTEFSTQ0KRU5EOlZFVkVOVA0KQkVHSU46VkVWRU5UDQpBVFRFTkRFRTtDTj0iQUJPVCBCZWF0cmljZSBET0lERi9QQVJOIjtSU1ZQPVRSVUU6bWFpbHRvOmJlYXRyaWNlLmFib3RAb3JhbmcNCgllLmNvbQ0KQVRURU5ERUU7Q049IkFCUkFIQU0gRGFtaWVuIEV4dCBEVFJTL0RPU00iO1JTVlA9VFJVRTptYWlsdG86ZGFicmFoYW0uZXh0QG9yDQoJYW5nZS5jb20NCkFUVEVOREVFO0NOPSJBREFNQ1pFV1NLSSBGcsOpZMOpcmlxdWUgRE1HUC9ETU0iO1JTVlA9VFJVRTptYWlsdG86ZnJlZGVyaXF1ZQ0KCS5hZGFtY3pld3NraUBvcmFuZ2UuY29tDQpBVFRFTkRFRTtDTj0iQURST0lUIExhdXJlbnQgRFRSUy9ET1NNIjtSU1ZQPVRSVUU6bWFpbHRvOmxhdXJlbnQuYWRyb2l0QG9yYW4NCglnZS5jb20NCkFUVEVOREVFO0NOPSJBS0JBUkFMWSBTYWlmeSBPRi9EU0lGIjtSU1ZQPVRSVUU6bWFpbHRvOnNhaWZ5LmFrYmFyYWx5QG9yYW5nZQ0KCS5jb20NCkFUVEVOREVFO0NOPSJBS05JTkUgQ2hyaXN0ZWxsZSBEQ0dQL0RTQ08iO1JTVlA9VFJVRTptYWlsdG86Y2hyaXN0ZWxsZS5ha25pbg0KCWVAb3JhbmdlLmNvbQ0KQVRURU5ERUU7Q049IkFMTEFSRCBFc3RlbGxlIE9GL0RSQ0dQIjtSU1ZQPVRSVUU6bWFpbHRvOmVzdGVsbGUuYWxsYXJkQG9yYW5nDQoJZS5jb20NCkFUVEVOREVFO0NOPSJBTUFORCBGYWJyaWNlIERNR1AiO1JTVlA9VFJVRTptYWlsdG86ZmFicmljZS5hbWFuZEBvcmFuZ2UuY29tDQpBVFRFTkRFRTtDTj0iQU5LSSBGYXRpaGEgRXh0IE9GL0RTSUYiO1JTVlA9VFJVRTppbnZhbGlkOm5vbWFpbA0KQVRURU5ERUU7Q049IkFOVE9VTiBNYXJpYW5uZSBETUdQIjtSU1ZQPVRSVUU6bWFpbHRvOm1hcmlhbm5lLmFudG91bkBvcmFuZ2UuDQoJY29tDQpBVFRFTkRFRTtDTj0iQVRBU1NJIExvdcOoeWUgT0YiO1JTVlA9VFJVRTptYWlsdG86bG91ZXllLmF0YXNzaUBvcmFuZ2UuY29tDQpBVFRFTkRFRTtDTj0iQVRMQU4gRGF2aWQgRE1HUC9ETU0iO1JTVlA9VFJVRTptYWlsdG86ZGF2aWQxLmF0bGFuQG9yYW5nZS5jb20NCkFUVEVOREVFO0NOPSJBVUZGUkFZIE1hcmMgT0YvRFJDR1AiO1JTVlA9VFJVRTptYWlsdG86bWFyYy5hdWZmcmF5QG9yYW5nZS5jbw0KCW0NCkFUVEVOREVFO0NOPSJBVVJJQUMgQ8OpY2lsZSBETUdQL0RNTSI7UlNWUD1UUlVFOm1haWx0bzpjZWNpbGUuYXVyaWFjQG9yYW5nZQ0KCS5jb20NCkFUVEVOREVFO0NOPSJCQSBDb3VtYmEgT0YvRFJDR1AiO1JTVlA9VFJVRTptYWlsdG86Y291bWJhLmJhQG9yYW5nZS5jb20NCkFUVEVOREVFO0NOPSJCQUlMTEFSRCBQYXRyaWNrIE5SUyI7UlNWUD1UUlVFOm1haWx0bzpwYXRyaWNrMS5iYWlsbGFyZEBvcmFuZw0KCWUuY29tDQpBVFRFTkRFRTtDTj0iQkFSQVUgWGF2aWVyIERNR1AiO1JTVlA9VFJVRTptYWlsdG86eGF2aWVyLmJhcmF1QG9yYW5nZS5jb20NCkFUVEVOREVFO0NOPSJCQVJCRSBKZWFuLUx1YyBPRi9EU0lGIjtSU1ZQPVRSVUU6bWFpbHRvOmplYW5sdWMuYmFyYmVAb3JhbmdlLg0KCWNvbQ0KQVRURU5ERUU7Q049IkJBUlJBVUQgTGF1cmVudCBPRi9EU0lGIjtSU1ZQPVRSVUU6bWFpbHRvOmxhdXJlbnQuYmFycmF1ZEBvcmFuDQoJZ2UuY29tDQpBVFRFTkRFRTtDTj0iQkFTU0VUIERFTklTIEZsb3JlbmNlIE9GL0RSQ0dQIjtSU1ZQPVRSVUU6bWFpbHRvOmZsb3JlbmNlLmJhc3MNCglldEBvcmFuZ2UuY29tDQpBVFRFTkRFRTtDTj0iQkFaSUVSRSBEb3JvdGjDqWUgU0NFIjtSU1ZQPVRSVUU6bWFpbHRvOmRvcm90aGVlLmJhemllcmVAb3JhbmcNCgllLmNvbQ0KQVRURU5ERUU7Q049IkJFQVUgQW5uZSBDZWxpbmUgT0YvRFJDR1AiO1JTVlA9VFJVRTptYWlsdG86YW5uZS1jZWxpbmUuYmVhdUBvDQoJcmFuZ2UuY29tDQpBVFRFTkRFRTtDTj0iQkVBVUNIQUlOIENsYWlyZSBETUdQL0RNTSI7UlNWUD1UUlVFOm1haWx0bzpjbGFpcmUuYmVhdWNoYWluQG8NCglyYW5nZS5jb20NCkFUVEVOREVFO0NOPSJCRUFVRklMUyBFcmljIERNR1AvRE1NIjtSU1ZQPVRSVUU6bWFpbHRvOmUuYmVhdWZpbHNAb3JhbmdlLmNvbQ0KQVRURU5ERUU7Q049IkJFQ1RBUkQgQmVydHJhbmQgRE1HUCI7UlNWUD1UUlVFOm1haWx0bzpiZXJ0cmFuZC5iZWN0YXJkQG9yYW5nDQoJZS5jb20NCkFUVEVOREVFO0NOPSJCRUtLQU9VSSBaaW5hIERDR1AvRFNDTyI7UlNWUD1UUlVFOm1haWx0bzp6aW5hLmJla2thb3VpQG9yYW5nZQ0KCS5jb20NCkFUVEVOREVFO0NOPSJCRUxBTUlSSSBLYXJpbWEgT0YvRFJDR1AiO1JTVlA9VFJVRTptYWlsdG86a2FyaW1hLmJlbGFtaXJpQG9yYQ0KCW5nZS5jb20NCkFUVEVOREVFO0NOPSJCRUxMQU5EIEplYW4gQ2hyaXN0b3BoZSBET0lERi9QQVJOIjtSU1ZQPVRSVUU6bWFpbHRvOmplYW5jaHJpcw0KCXRvcGhlLmJlbGxhbmRAb3JhbmdlLmNvbQ0KQVRURU5ERUU7Q049IkJFTkFNQVIgQWxpIERURi9ERVNJIjtSU1ZQPVRSVUU6bWFpbHRvOmFsaS5iZW5hbWFyQG9yYW5nZS5jb20NCkFUVEVOREVFO0NOPSJCRVJPRElBUyBGbG9yZW50aW5lIERNR1AvRE1NIjtSU1ZQPVRSVUU6bWFpbHRvOmZsb3JlbnRpbmUuYmVybw0KCWRpYXNAb3JhbmdlLmNvbQ0KQVRURU5ERUU7Q049IkJFUlNPVCBTdMOpcGhhbmllIERNR1AvRE5VIjtSU1ZQPVRSVUU6bWFpbHRvOnN0ZXBoYW5pZS5iZXJzb3RADQoJb3JhbmdlLmNvbQ0KQVRURU5ERUU7Q049IkJJTkFZIEFsZXhpcyBPUkFOR0UgQ09OU1VMVElORyI7UlNWUD1UUlVFOm1haWx0bzphbGV4aXMuYmluYXlADQoJb3JhbmdlLmNvbQ0KQVRURU5ERUU7Q049IkJPQ1pNQUsgQ2Fyb2xpbmUgRE1HUC9ETlUiO1JTVlA9VFJVRTptYWlsdG86Y2Fyb2xpbmUuYm9jem1ha0BvDQoJcmFuZ2UuY29tDQpBVFRFTkRFRTtDTj0iQk9OTkFSRCBEZW5pcyBPRi9EU0lGIjtSU1ZQPVRSVUU6bWFpbHRvOmRlbmlzLmJvbm5hcmRAb3JhbmdlLmMNCglvbQ0KQVRURU5ERUU7Q049IkJPTlpPTSBSb21haW4gRE1HUC9ETU0iO1JTVlA9VFJVRTptYWlsdG86cm9tYWluLmJvbnpvbUBvcmFuZ2UuDQoJY29tDQpBVFRFTkRFRTtDTj0iQk9SRUxZIENocmlzdG9waGUgRE1HUC9ETU0iO1JTVlA9VFJVRTptYWlsdG86Y2hyaXN0b3BoZS5ib3JlbHkNCglAb3JhbmdlLmNvbQ0KQVRURU5ERUU7Q049IkJPVUlMTE9OIFN0ZXBoYW5pZSBETy9ET1JNIjtSU1ZQPVRSVUU6bWFpbHRvOnN0ZXBoYW5pZS5ib3VpbGxvDQoJbkBvcmFuZ2UuY29tDQpBVFRFTkRFRTtDTj0iQk9VUkRVIEdyZWdvaXJlIERUUlMvRE9TTSI7UlNWUD1UUlVFOm1haWx0bzpncmVnb2lyZS5ib3VyZHVAb3INCglhbmdlLmNvbQ0KQVRURU5ERUU7Q049IkJSSUFOQ09OIElzYWJlbGxlIE9GL0RTSUYiO1JTVlA9VFJVRTptYWlsdG86aXNhYmVsbGUuYnJpYW5jb25ADQoJb3JhbmdlLmNvbQ0KQVRURU5ERUU7Q049IkJST0lOIEJSSVNTRVQgTXlyaWFtIE9GL0RTSUYiO1JTVlA9VFJVRTptYWlsdG86bXlyaWFtLmJyb2luYnJpDQoJc3NldEBvcmFuZ2UuY29tDQpBVFRFTkRFRTtDTj0iQlJPVVNTT0xFIEN5cmlsbCBPRi9EUkNHUCI7UlNWUD1UUlVFOm1haWx0bzpjeXJpbGwuYnJvdXNzb2xlQG8NCglyYW5nZS5jb20NCkFUVEVOREVFO0NOPSJDQURPVVggSmVyb21lIERNR1AiO1JTVlA9VFJVRTptYWlsdG86amVyb21lLmNhZG91eEBvcmFuZ2UuY29tDQpBVFRFTkRFRTtDTj0iQ0FITiBGbG9yZW5jZSBETUdQIjtSU1ZQPVRSVUU6bWFpbHRvOmZsb3JlbmNlLmNhaG5Ab3JhbmdlLmNvbQ0KQVRURU5ERUU7Q049IkNBTUVSIEZhbm55IERNR1AvRE1NIjtSU1ZQPVRSVUU6bWFpbHRvOmZhbm55LmNhbWVyQG9yYW5nZS5jb20NCkFUVEVOREVFO0NOPSJDQVJVU08gVmlyZ2luaWUgRXh0IERUUlMvRE9TTSI7UlNWUD1UUlVFOm1haWx0bzp2Y2FydXNvLmV4dEBvcg0KCWFuZ2UuY29tDQpBVFRFTkRFRTtDTj0iQ0FTQU5PVkEgQ8OpbGluZSBOUlMiO1JTVlA9VFJVRTptYWlsdG86Y2VsaW5lLmNhc2Fub3ZhQG9yYW5nZS4NCgljb20NCkFUVEVOREVFO0NOPSJDRUlOVFJFWSBJc2FiZWxsZSBETUdQL0ROVSI7UlNWUD1UUlVFOm1haWx0bzppc2FiZWxsZS5jZWludHJleQ0KCUBvcmFuZ2UuY29tDQpBVFRFTkRFRTtDTj0iQ0hBSUxMT1VYIFhhdmllciBEQ0dQL0RTQ08iO1JTVlA9VFJVRTptYWlsdG86eGF2aWVyLmNoYWlsbG91eEANCglvcmFuZ2UuY29tDQpBVFRFTkRFRTtDTj0iQ0hBUkJPTk5JRVIgRXZhIERNR1AvRE5VIjtSU1ZQPVRSVUU6bWFpbHRvOmV2YS5jaGFyYm9ubmllckBvcmENCgluZ2UuY29tDQpBVFRFTkRFRTtDTj0iQ0hBUlZFVCBNYXR0aGlldSBEVFJTL0RPU00iO1JTVlA9VFJVRTptYWlsdG86bWF0dGhpZXUuY2hhcnZldEANCglvcmFuZ2UuY29tDQpBVFRFTkRFRTtDTj0nY2hyaXN0b3BoZS5jb21iZXRAZ3JlZW4tY29uc2VpbC5jb20nO1JTVlA9VFJVRTptYWlsdG86J2NocmlzdG8NCglwaGUuY29tYmV0QGdyZWVuLWNvbnNlaWwuY29tJw0KQVRURU5ERUU7Q049IkNPQVQgQWxhaW4gT0YvRFJDR1AiO1JTVlA9VFJVRTptYWlsdG86YWxhaW4uY29hdEBvcmFuZ2UuY29tDQpBVFRFTkRFRTtDTj0iQ09VVElFUiBTdGVwaGFuZSBPRi9EUkNHUCI7UlNWUD1UUlVFOm1haWx0bzpzdGVwaGFuZS5jb3V0aWVyQG8NCglyYW5nZS5jb20NCkFUVEVOREVFO0NOPSJDT1lORSBBcm5hdWQgT0YvRFJDR1AiO1JTVlA9VFJVRTptYWlsdG86YXJuYXVkLmNveW5lQG9yYW5nZS5jbw0KCW0NCkFUVEVOREVFO0NOPSJERSBQQURJUkFDIEdyw6lnb2lyZSBETUdQL0ROVSI7UlNWUD1UUlVFOm1haWx0bzpncmVnb2lyZS5kZXBhZA0KCWlyYWNAb3JhbmdlLmNvbQ0KQVRURU5ERUU7Q049IkRFQ0xFUkNLIERlYm9yYWggRE1HUCI7UlNWUD1UUlVFOm1haWx0bzpkZWJvcmFoLmRlY2xlcmNrQG9yYW5nDQoJZS5jb20NCkFUVEVOREVFO0NOPSJERUNPTUJMRSBCZW5vaXQgRE1HUCI7UlNWUD1UUlVFOm1haWx0bzpiZW5vaXQuZGVjb21ibGVAb3JhbmdlLg0KCWNvbQ0KQVRURU5ERUU7Q049IkRFTCBBR1VJTEEgRnJhbmNrIERNR1AiO1JTVlA9VFJVRTptYWlsdG86ZnJhbmNrLmRlbGFndWlsYUBvcmFuDQoJZ2UuY29tDQpBVFRFTkRFRTtDTj0iREVMQUNPVVJUIEVtbWFudWVsIE9GL0RTSUYiO1JTVlA9VFJVRTptYWlsdG86ZW1tYW51ZWwuZGVsYWNvdXINCgl0QG9yYW5nZS5jb20NCkFUVEVOREVFO0NOPSJERUxBSU4gTWFyYyBPRi9EUkNHUCI7UlNWUD1UUlVFOm1haWx0bzptYXJjLmRlbGFpbkBvcmFuZ2UuY29tDQpBVFRFTkRFRTtDTj0iREVMRU1BUiBSdWR5IERNR1AvRE1NIjtSU1ZQPVRSVUU6bWFpbHRvOnJ1ZHkuZGVsZW1hckBvcmFuZ2UuY28NCgltDQpBVFRFTkRFRTtDTj0iREVNRU5JRVIgRnJhbmNrIERNR1AvRE5VIjtSU1ZQPVRSVUU6bWFpbHRvOmZyYW5jay5kZW1lbmllckBvcmENCgluZ2UuY29tDQpBVFRFTkRFRTtDTj0iREVSTElOQ09VUlQgU2ViYXN0aWVuIERNR1AvRE1NIjtSU1ZQPVRSVUU6bWFpbHRvOnNlYmFzdGllbi5kZXINCglsaW5jb3VydEBvcmFuZ2UuY29tDQpBVFRFTkRFRTtDTj0iREVST1VJQ0hFIE5vcmEgRXh0IERUUlMvRE9TTSI7UlNWUD1UUlVFOm1haWx0bzpuZGVyb3VpY2hlLmV4dEANCglvcmFuZ2UuY29tDQpBVFRFTkRFRTtDTj0iREVTQ0FUIEVtaWxpZSBPRi9EQ09GIjtSU1ZQPVRSVUU6bWFpbHRvOmVtaWxpZS5kZXNjYXRAb3JhbmdlLmMNCglvbQ0KQVRURU5ERUU7Q049IkRFU0pBUkRJTlMgQ2FyaW5lIERNR1AiO1JTVlA9VFJVRTptYWlsdG86Y2FyaW5lLmRlc2phcmRpbnNAb3JhDQoJbmdlLmNvbQ0KQVRURU5ERUU7Q049IkRFU01VUkUgR3dsYWR5cyBETUdQL0RNTSI7UlNWUD1UUlVFOm1haWx0bzpnd2xhZHlzLmRlc211cmVAb3JhDQoJbmdlLmNvbQ0KQVRURU5ERUU7Q049IkRFVkVSIEFtZWxpZSBETUdQIjtSU1ZQPVRSVUU6bWFpbHRvOmFtZWxpZS5kZXZlckBvcmFuZ2UuY29tDQpBVFRFTkRFRTtDTj0iRFVCT0lTIEJlcnRyYW5kIERNR1AvRE1NIjtSU1ZQPVRSVUU6bWFpbHRvOmJlcnRyYW5kLmR1Ym9pc0BvcmENCgluZ2UuY29tDQpBVFRFTkRFRTtDTj0iRFVCT1NUIFZhbMOpcmllIE9GL0RTSUYiO1JTVlA9VFJVRTptYWlsdG86dmFsZXJpZS5kdWJvc3RAb3JhbmcNCgllLmNvbQ0KQVRURU5ERUU7Q049IkRVTU9OVCBTZWJhc3RpZW4gT0YvRFNJRiI7UlNWUD1UUlVFOm1haWx0bzpzZWJhc3RpZW4uZHVtb250QG9yDQoJYW5nZS5jb20NCkFUVEVOREVFO0NOPSJFTCBLQURJUkkgU291ZmlhbmUgRXh0IE9GL0RTSUYiO1JTVlA9VFJVRTptYWlsdG86c2Vsa2FkaXJpLmV4dA0KCUBvcmFuZ2UuY29tDQpBVFRFTkRFRTtDTj0iRU1TQUxFTSBNYWdhbGkgRE1HUC9ETU0iO1JTVlA9VFJVRTptYWlsdG86bWFnYWxpLmVtc2FsZW1Ab3JhbmcNCgllLmNvbQ0KQVRURU5ERUU7Q049IkVZTUVSWSBKZWFuLU1hcmMgT0YvRFNJRiI7UlNWUD1UUlVFOm1haWx0bzpqZWFubWFyYy5leW1lcnlAb3JhDQoJbmdlLmNvbQ0KQVRURU5ERUU7Q049IkZFUlJBTkQgQWxleGFuZHJlIERURi9ERVMiO1JTVlA9VFJVRTptYWlsdG86YWxleGFuZHJlLmZlcnJhbmRADQoJb3JhbmdlLmNvbQ0KQVRURU5ERUU7Q049IkZFUlJPTiBCcnVubyBPRi9EUkNHUCI7UlNWUD1UUlVFOm1haWx0bzpicnVuby5mZXJyb25Ab3JhbmdlLmNvDQoJbQ0KQVRURU5ERUU7Q049IkZMRU9VVEVSIEF1cmVsaWVuIERNR1AvRE5VIjtSU1ZQPVRSVUU6bWFpbHRvOmF1cmVsaWVuLmZsZW91dGVyDQoJQG9yYW5nZS5jb20NCkFUVEVOREVFO0NOPSJGT05URVMgSmVhbi1QaWVycmUgT0YvRFNJRiI7UlNWUD1UUlVFOm1haWx0bzpqZWFucGllcnJlLmZvbnRlcw0KCUBvcmFuZ2UuY29tDQpBVFRFTkRFRTtDTj0iR0FCSUxMWSBCZXJuYXJkIE9GL0RSQ0dQIjtSU1ZQPVRSVUU6bWFpbHRvOmJlcm5hcmQuZ2FiaWxseUBvcmENCgluZ2UuY29tDQpBVFRFTkRFRTtDTj0iR0FSTklFUiBFbWlsaWUgRE1HUCI7UlNWUD1UUlVFOm1haWx0bzplbWlsaWUuZ2FybmllckBvcmFuZ2UuY28NCgltDQpBVFRFTkRFRTtDTj0iR0FTQ09OIEdlcmFsZGluZSBETUdQL0RNTSI7UlNWUD1UUlVFOm1haWx0bzpnZXJhbGRpbmUuZ2FzY29uQG8NCglyYW5nZS5jb20NCkFUVEVOREVFO0NOPSJHQVNJT1JPV1NLSSBQaWVycmUgU09GUkVDT00iO1JTVlA9VFJVRTptYWlsdG86cGllcnJlLmdhc2lvcm93cw0KCWtpQHNvZnJlY29tLmNvbQ0KQVRURU5ERUU7Q049IkdBVVRIRVJBVCBDaHJpc3RvcGhlIE9GL0RTSUYiO1JTVlA9VFJVRTptYWlsdG86Y2hyaXN0b3BoZS5nYXV0DQoJaGVyYXRAb3JhbmdlLmNvbQ0KQVRURU5ERUU7Q049IkdCQUdVSURJLUFMSUEgRWxpYW5lIERNR1AvRE1NIjtSU1ZQPVRSVUU6bWFpbHRvOmVsaWFuZS5nYmFndWlkDQoJaWFsaWFAb3JhbmdlLmNvbQ0KQVRURU5ERUU7Q049J2dlb3JnZXMucm9jY29AZ3JlZW4tY29uc2VpbC5jb20nO1JTVlA9VFJVRTptYWlsdG86J2dlb3JnZXMucm9jDQoJY29AZ3JlZW4tY29uc2VpbC5jb20nDQpBVFRFTkRFRTtDTj0iR8OJUkFSRCBSw6lnaW5lIE9GL0RRU0MiO1JTVlA9VFJVRTptYWlsdG86cmVnaW5lLmdlcmFyZEBvcmFuZ2UNCgkuY29tDQpBVFRFTkRFRTtDTj0iR09NSVMgQ2hyaXN0b3BoZSBPRi9EUkNHUCI7UlNWUD1UUlVFOm1haWx0bzpjaHJpc3RvcGhlLmdvbWlzQG8NCglyYW5nZS5jb20NCkFUVEVOREVFO0NOPSJHT1JJTiBNYXJpYW5uZSBETUdQL0RNTSI7UlNWUD1UUlVFOm1haWx0bzptYXJpYW5uZS5nb3JpbkBvcmFuZw0KCWUuY29tDQpBVFRFTkRFRTtDTj0iR09STklBSyBKYWNlayBEVEYvREVTIjtSU1ZQPVRSVUU6bWFpbHRvOmphY2VrLmdvcm5pYWtAb3JhbmdlLmMNCglvbQ0KQVRURU5ERUU7Q049IkdPVCBOaWNvbGFzIERNR1AvRE5VIjtSU1ZQPVRSVUU6bWFpbHRvOm5pY29sYXMuZ290QG9yYW5nZS5jb20NCkFUVEVOREVFO0NOPSJHT1VQSUwtQU5EUkVBU1NJQU4gVsOpcm9uaXF1ZSBEQ0dQL0Q0QyI7UlNWUD1UUlVFOm1haWx0bzp2ZXJvbg0KCWlxdWUuZ291cGlsQG9yYW5nZS5jb20NCkFUVEVOREVFO0NOPSJHUklORU5XQUxEIENsYWlyZSBETUdQL0RNTSI7UlNWUD1UUlVFOm1haWx0bzpjbGFpcmUuZ3JpbmVud2FsZA0KCUBvcmFuZ2UuY29tDQpBVFRFTkRFRTtDTj0iR1JJU0lFUiBDeXJpbCBPRi9EU0lGIjtSU1ZQPVRSVUU6bWFpbHRvOmN5cmlsLmdyaXNpZXJAb3JhbmdlLmMNCglvbQ0KQVRURU5ERUU7Q049IkdVRU5BSVJFIENocmlzdG9waGUgT0YvRFJDR1AiO1JTVlA9VFJVRTptYWlsdG86Y2hyaXN0b3BoZS5ndWVuDQoJYWlyZUBvcmFuZ2UuY29tDQpBVFRFTkRFRTtDTj0iR1VJU05FVCBBbm5lIERNR1AiO1JTVlA9VFJVRTptYWlsdG86YW5uZS5ndWlzbmV0QG9yYW5nZS5jb20NCkFUVEVOREVFO0NOPSJIQURET1VDSEUgUmFkaWEgT0YvRFJDR1AiO1JTVlA9VFJVRTptYWlsdG86cmFkaWEuaGFkZG91Y2hlQG9yYQ0KCW5nZS5jb20NCkFUVEVOREVFO0NOPSJIQU1NT1VNSSBTYW1pYSBPRi9EUkNHUCI7UlNWUD1UUlVFOm1haWx0bzpzYW1pYS5oYW1tb3VtaUBvcmFuZw0KCWUuY29tDQpBVFRFTkRFRTtDTj0iSEFSRFkgRmFubnkgRENHUC9ENEMiO1JTVlA9VFJVRTptYWlsdG86ZmFubnkuaGFyZHlAb3JhbmdlLmNvbQ0KQVRURU5ERUU7Q049IkhFQlLDiSBKw6lyw6ltaWUgRE9JREYvUEFSTiI7UlNWUD1UUlVFOm1haWx0bzpqZXJlbWllLmhlYnJlQG9yDQoJYW5nZS5jb20NCkFUVEVOREVFO0NOPSJIT1ZFIEFudGhvbnkgRE1HUC9ETU0iO1JTVlA9VFJVRTptYWlsdG86YW50aG9ueS5ob3ZlQG9yYW5nZS5jbw0KCW0NCkFUVEVOREVFO0NOPSJJR1JPVUZBIEhpYmEgRXh0IE9GL0RTSUYiO1JTVlA9VFJVRTptYWlsdG86aGlncm91ZmEuZXh0QG9yYW5nZQ0KCS5jb20NCkFUVEVOREVFO0NOPSJKQUNRVUVUIE15cmlhbSBPRi9EUkNHUCI7UlNWUD1UUlVFOm1haWx0bzpteXJpYW0uamFjcXVldEBvcmFuZw0KCWUuY29tDQpBVFRFTkRFRTtDTj0iSkFNRVQgQ2xvdGhpbGRlIE9GL0RSQ0dQIjtSU1ZQPVRSVUU6bWFpbHRvOmNsb3RoaWxkZS5qYW1ldEBvcmENCgluZ2UuY29tDQpBVFRFTkRFRTtDTj0iSkFORE9UIEZhYmllbm5lIE9GL0RSQ0dQIjtSU1ZQPVRSVUU6bWFpbHRvOmZhYmllbm5lLmphbmRvdEBvcmENCgluZ2UuY29tDQpBVFRFTkRFRTtDTj0iSk9BTyBQYXRyaWNrIERNR1AvRE1NIjtSU1ZQPVRSVUU6bWFpbHRvOnBhdHJpY2suam9hb0BvcmFuZ2UuY28NCgltDQpBVFRFTkRFRTtDTj0iSk9MSVZFVCBGbG9yZW50IE9GL0RTSUYiO1JTVlA9VFJVRTptYWlsdG86ZmxvcmVudC5qb2xpdmV0QG9yYW4NCglnZS5jb20NCkFUVEVOREVFO0NOPSJKT1VMSU4gTWFyaWUgUGF1bGUgRkcvRENURyI7UlNWUD1UUlVFOm1haWx0bzptYXJpZXBhdWxlLmpvdWxpbg0KCUBvcmFuZ2UuY29tDQpBVFRFTkRFRTtDTj0iS0VSWUhVRUwgQ2hsb2UgRE1HUC9ETU0iO1JTVlA9VFJVRTptYWlsdG86Y2hsb2Uua2VyeWh1ZWxAb3JhbmcNCgllLmNvbQ0KQVRURU5ERUU7Q049IktIQUxGQSBOZWlsYSBPRi9EU0lGIjtSU1ZQPVRSVUU6bWFpbHRvOm5laWxhLmtoYWxmYUBvcmFuZ2UuY29tDQpBVFRFTkRFRTtDTj0iS09DSE5FVkEgT2xnYSBPRi9EUkNHUCI7UlNWUD1UUlVFOmludmFsaWQ6bm9tYWlsDQpBVFRFTkRFRTtDTj0iTEFIWUFORSBGYWl6YSBEVEYvREVTIjtSU1ZQPVRSVUU6bWFpbHRvOmZhaXphLmxhaHlhbmVAb3JhbmdlLmMNCglvbQ0KQVRURU5ERUU7Q049IkxBTVJJIFNhbWlhIERNR1AvRE1NIjtSU1ZQPVRSVUU6bWFpbHRvOnNhbWlhLmxhbXJpQG9yYW5nZS5jb20NCkFUVEVOREVFO0NOPSJMRCBDQVNUT1IgQ0FUQUxPR1VFIjtSU1ZQPVRSVUU6bWFpbHRvOmNhc3Rvci5jYXRhbG9ndWVAb3JhbmdlLg0KCWNvbQ0KQVRURU5ERUU7Q049IkxEIENPT1JESU5BVElPTiBDQVRBTE9HVUUiO1JTVlA9VFJVRTptYWlsdG86Y29vcmRpbmF0aW9uLmNhdGFsDQoJb2d1ZUBvcmFuZ2UuY29tDQpBVFRFTkRFRTtDTj0iTEQgT0YgRERTLUJpbGxpbmctREcyUC1DYXQgQ2FsIjtSU1ZQPVRSVUU6bWFpbHRvOmxkZGRzLmJpbGxpbmcNCglkZzJwY2F0Y2lhbEBvcmFuZ2UuY29tDQpBVFRFTkRFRTtDTj0iTEUgTUFSRUMgR2HDq2xsZSBETUdQL0RNTSI7UlNWUD1UUlVFOm1haWx0bzpnYWVsbGUubGVtYXJlY0BvcmENCgluZ2UuY29tDQpBVFRFTkRFRTtDTj0iTEVDSEVSVlkgWXZlcyBPRi9EUkNHUCI7UlNWUD1UUlVFOm1haWx0bzp5dmVzLmxlY2hlcnZ5QG9yYW5nZS4NCgljb20NCkFUVEVOREVFO0NOPSJMRUZFVVZSRSBQYXNjYWwgSU1UL0RDL0RTIjtSU1ZQPVRSVUU6bWFpbHRvOnBhc2NhbC5sZWZldXZyZUBvcg0KCWFuZ2UuY29tDQpBVFRFTkRFRTtDTj0iTEVHUkFORCBHcmVnb3J5IERUUlMvRE9TTSI7UlNWUD1UUlVFOm1haWx0bzpncmVnb3J5LmxlZ3JhbmRAb3INCglhbmdlLmNvbQ0KQVRURU5ERUU7Q049IkxFVE9VUk5FTCBBbm5lLUNsYWlyZSBETUdQIjtSU1ZQPVRSVUU6bWFpbHRvOmFubmVjbGFpcmUubGV0b3VyDQoJbmVsQG9yYW5nZS5jb20NCkFUVEVOREVFO0NOPSJMRVRVUlFVRSBEZWxwaGluZSBETUdQL0RNTSI7UlNWUD1UUlVFOm1haWx0bzpkZWxwaGluZS5sZXR1cnF1ZQ0KCUBvcmFuZ2UuY29tDQpBVFRFTkRFRTtDTj0iTEkgWWFxaSBETUdQL0RNTSI7UlNWUD1UUlVFOm1haWx0bzp5YXFpLmxpQG9yYW5nZS5jb20NCkFUVEVOREVFO0NOPSJMSU5HSUJFIExpbmUgRE1HUC9ETU0iO1JTVlA9VFJVRTptYWlsdG86bGluZS5saW5naWJlQG9yYW5nZS5jbw0KCW0NCkFUVEVOREVFO0NOPSJMT0lBTCBMdWMgSHViZXJ0IE9GL0RTSUYiO1JTVlA9VFJVRTptYWlsdG86bHVjaHViZXJ0LmxvaWFsQG9yYQ0KCW5nZS5jb20NCkFUVEVOREVFO0NOPSJMT1AgTHlkaWUgT0YvRFJDR1AiO1JTVlA9VFJVRTptYWlsdG86bHlkaWUubG9wQG9yYW5nZS5jb20NCkFUVEVOREVFO0NOPSJMT1VJUyBNQVJJRSBSYXBoYWVsIE9GL0RSQ0dQIjtSU1ZQPVRSVUU6bWFpbHRvOnJhcGhhZWwubG91aXNtYQ0KCXJpZUBvcmFuZ2UuY29tDQpBVFRFTkRFRTtDTj0iTFVCRVQgUGllcnJlLUdpbGxlcyBPRi9EU0lGIjtSU1ZQPVRSVUU6bWFpbHRvOnBpZXJyZWdpbGxlcy5sdWINCglldEBvcmFuZ2UuY29tDQpBVFRFTkRFRTtDTj0iTFVDSUFOSSBTdMOpcGhhbmUgRFRSUy9ET1NNIjtSU1ZQPVRSVUU6bWFpbHRvOnN0ZXBoYW5lLmx1Y2lhbmkNCglAb3JhbmdlLmNvbQ0KQVRURU5ERUU7Q049Ik1BSVNPTk5FVVZFIEZhYmllbm5lIERNR1AiO1JTVlA9VFJVRTptYWlsdG86ZmFiaWVubmUubWFpc29ubmV1DQoJdmVAb3JhbmdlLmNvbQ0KQVRURU5ERUU7Q049Ik1BUkNVVEEgTmFkaWEgRFRSUy9ET1NNIjtSU1ZQPVRSVUU6bWFpbHRvOm5hZGlhLm1hcmN1dGFAb3JhbmdlDQoJLmNvbQ0KQVRURU5ERUU7Q049Ik1BUlFVRVMgTXVyaWVsIE9GL0RSQ0dQIjtSU1ZQPVRSVUU6bWFpbHRvOm11cmllbC5tYXJxdWVzQG9yYW5nDQoJZS5jb20NCkFUVEVOREVFO0NOPSJNQVJTQVVEIENobG9lIERNR1AvRE1NIjtSU1ZQPVRSVUU6bWFpbHRvOmNobG9lLm1hcnNhdWRAb3JhbmdlLg0KCWNvbQ0KQVRURU5ERUU7Q049Ik1BUlRJTiBCcnVubyBFeHQgT0YvRFNJRiI7UlNWUD1UUlVFOm1haWx0bzpibWFydGluLmV4dEBvcmFuZ2UuDQoJY29tDQpBVFRFTkRFRTtDTj0iTUFUSElFVSBEYXZpZCBPRi9EUkNHUCI7UlNWUD1UUlVFOm1haWx0bzpkYXZpZC5tYXRoaWV1QG9yYW5nZS4NCgljb20NCkFUVEVOREVFO0NOPSJNRVBQSUVMIEFtZWxpZSBETUdQL0RNTSI7UlNWUD1UUlVFOm1haWx0bzphbWVsaWUubWVwcGllbEBvcmFuZw0KCWUuY29tDQpBVFRFTkRFRTtDTj0iTUlDSEVMT1QgQ29yaW5uZSBPRi9EUkNHUCI7UlNWUD1UUlVFOm1haWx0bzpjb3Jpbm5lLm1pY2hlbG90QG8NCglyYW5nZS5jb20NCkFUVEVOREVFO0NOPSJNT1NOSUVSIExvw69jIE9GL0RTSUYiO1JTVlA9VFJVRTptYWlsdG86bG9pYy5tb3NuaWVyQG9yYW5nZS5jbw0KCW0NCkFUVEVOREVFO0NOPSJNT1VHQU1BRE9VIERqYWhhZmFyIEV4dCBPRi9EU0lGIjtSU1ZQPVRSVUU6bWFpbHRvOmRtb3VnYW1hZG91Lg0KCWV4dEBvcmFuZ2UuY29tDQpBVFRFTkRFRTtDTj0iTU9VU1NFVCBDbGFpcmUgRE1HUCI7UlNWUD1UUlVFOm1haWx0bzpjbGFpcmUubW91c3NldEBvcmFuZ2UuY28NCgltDQpBVFRFTkRFRTtDTj0iTVVSQVQgTWljaGVsIE9GL0RTSUYiO1JTVlA9VFJVRTptYWlsdG86bWljaGVsLm11cmF0QG9yYW5nZS5jb20NCkFUVEVOREVFO0NOPSJOT0xPUkdVRVMgQ2xhdWRlIElzYWJlbGxlIERNR1AvRE1NIjtSU1ZQPVRSVUU6bWFpbHRvOmNsYXVkZWlzYQ0KCWJlbGxlLm5vbG9yZ3Vlc0BvcmFuZ2UuY29tDQpBVFRFTkRFRTtDTj0nb2xpdmllci52YW5zb25AZ3JlZW4tY29uc2VpbC5jb20nO1JTVlA9VFJVRTptYWlsdG86J29saXZpZXIudmENCgluc29uQGdyZWVuLWNvbnNlaWwuY29tJw0KQVRURU5ERUU7Q049Ik9SQkFJIENvcm5lbCBEVFJTL0RPU00iO1JTVlA9VFJVRTptYWlsdG86Y29ybmVsLm9yYmFpQG9yYW5nZS5jDQoJb20NCkFUVEVOREVFO0NOPSJPUklPTEkgRmFiaWVuIERNR1AvRE1NIjtSU1ZQPVRSVUU6bWFpbHRvOmZhYmllbi5vcmlvbGlAb3JhbmdlLg0KCWNvbQ0KQVRURU5ERUU7Q049IlBBUEFEQUNDSSBIw6lsw6huZSBPRi9EU0lGIjtSU1ZQPVRSVUU6bWFpbHRvOmhlbGVuZS5wYXBhZGFjY2lADQoJb3JhbmdlLmNvbQ0KQVRURU5ERUU7Q049IlBBU1FVSUVSIEF1ZHJleSBEVFJTL0RPU00iO1JTVlA9VFJVRTptYWlsdG86YXVkcmV5LnBhc3F1aWVyQG9yDQoJYW5nZS5jb20NCkFUVEVOREVFO0NOPSJQQVNRVUlFUiBMYXVyaWFubmUgRE1HUC9ETU0iO1JTVlA9VFJVRTptYWlsdG86bGF1cmlhbm5lLnBhc3F1aQ0KCWVyQG9yYW5nZS5jb20NCkFUVEVOREVFO0NOPSJQRVJST1QgQ2FyaW5lIE9GL0RSQ0dQIjtSU1ZQPVRSVUU6bWFpbHRvOmNhcmluZS5wZXJyb3RAb3JhbmdlLg0KCWNvbQ0KQVRURU5ERUU7Q049IlBJQ0NJT05FIFLDqW1pIERDR1AvRDRDIjtSU1ZQPVRSVUU6bWFpbHRvOnJlbWkucGljY2lvbmVAb3JhbmdlDQoJLmNvbQ0KQVRURU5ERUU7Q049IlBJRVJSRSBGcmFuw6dvaXMgRE1HUCI7UlNWUD1UUlVFOm1haWx0bzpmcmFuY29pcy5waWVycmVAb3JhbmdlDQoJLmNvbQ0KQVRURU5ERUU7Q049IlBPSVJJRVIgTWF0dGhpZXUgRXh0IE9GL0RSQ0dQIjtSU1ZQPVRSVUU6bWFpbHRvOm1wb2lyaWVyLmV4dEBvDQoJcmFuZ2UuY29tDQpBVFRFTkRFRTtDTj0iUFVHSU5JRVIgSmVhbi1NYXJjIE9GL0RTSUYiO1JTVlA9VFJVRTptYWlsdG86amVhbi1tYXJjLnB1Z2luaWUNCglyQG9yYW5nZS5jb20NCkFUVEVOREVFO0NOPSJQVVlUIEFubmUgT1dGL0RPUE0iO1JTVlA9VFJVRTptYWlsdG86YW5uZS5wdXl0QG9yYW5nZS5jb20NCkFUVEVOREVFO0NOPSJSQU5HT00gTWFyYyBEVFJTL0RPU0lQIjtSU1ZQPVRSVUU6bWFpbHRvOm1hcmMucmFuZ29tQG9yYW5nZS5jbw0KCW0NCkFUVEVOREVFO0NOPSJSRVkgQ2hyaXN0b3BoZSBPRi9EU0lGIjtSU1ZQPVRSVUU6bWFpbHRvOmNocmlzdG9waGUucmV5QG9yYW5nZQ0KCS5jb20NCkFUVEVOREVFO0NOPSJST0RSSUdVRVMgQW5hIERNR1AiO1JTVlA9VFJVRTptYWlsdG86YW5hLnJvZHJpZ3Vlc0BvcmFuZ2UuY29tDQpBVFRFTkRFRTtDTj0iUk9EUklHVUVTIEFubmUgTWFyaWUgT0YvRFJDR1AiO1JTVlA9VFJVRTptYWlsdG86YW5uZW1hcmllLnJvZHINCglpZ3Vlc0BvcmFuZ2UuY29tDQpBVFRFTkRFRTtDTj0iUk9HRVIgREUgR0FSREVMTEUgVGhpYmF1bHQgT1dGL0RPUE0iO1JTVlA9VFJVRTptYWlsdG86dGhpYmF1bHQNCgkucm9nZXJkZWdhcmRlbGxlQG9yYW5nZS5jb20NCkFUVEVOREVFO0NOPSJST1JHVUVTIFRob21hcyBEQ0dQL0Q0QyI7UlNWUD1UUlVFOmludmFsaWQ6bm9tYWlsDQpBVFRFTkRFRTtDTj0iUk9TQSBTb3BoaWUgRE1HUCI7UlNWUD1UUlVFOm1haWx0bzpzb3BoaWUucm9zYUBvcmFuZ2UuY29tDQpBVFRFTkRFRTtDTj0iUk9ZIENocmlzdGluZSBPRi9EUkNHUCI7UlNWUD1UUlVFOm1haWx0bzpjaHJpc3RpbmUucm95QG9yYW5nZS4NCgljb20NCkFUVEVOREVFO0NOPSJST1lFUkUgRGVscGhpbmUgT0YvRFJDR1AiO1JTVlA9VFJVRTptYWlsdG86ZGVscGhpbmUucm95ZXJlQG9yYQ0KCW5nZS5jb20NCkFUVEVOREVFO0NOPSJTQVJST1VJTEhFIEplYW4gTWljaGVsIE9GL0RTSUYiO1JTVlA9VFJVRTptYWlsdG86amVhbm1pY2hlbC5zYQ0KCXJyb3VpbGhlQG9yYW5nZS5jb20NCkFUVEVOREVFO0NOPSJTQVVMTklFUiBKZWFuIERDR1AvRFBTQyI7UlNWUD1UUlVFOm1haWx0bzpqZWFuMS5zYXVsbmllckBvcmFuZw0KCWUuY29tDQpBVFRFTkRFRTtDTj0iU0NFVEJVTiBNYXJpZSBETUdQL0RNTSI7UlNWUD1UUlVFOm1haWx0bzptYXJpZS5zY2V0YnVuQG9yYW5nZS4NCgljb20NCkFUVEVOREVFO0NOPSJTRVJFUyBKdWxpZW4gT0YvRFNJRiI7UlNWUD1UUlVFOm1haWx0bzpqdWxpZW4uc2VyZXNAb3JhbmdlLmNvbQ0KQVRURU5ERUU7Q049IlNFVkVMTEVDIEd1aWxsYXVtZSBFeHQgT0YvRFNJRiI7UlNWUD1UUlVFOm1haWx0bzpnc2V2ZWxsZWMuZXh0DQoJQG9yYW5nZS5jb20NCkFUVEVOREVFO0NOPSJTSUxMT04gU2FuZHJhIE9GL0RSQ0dQIjtSU1ZQPVRSVUU6bWFpbHRvOnNhbmRyYS5zaWxsb25Ab3JhbmdlLg0KCWNvbQ0KQVRURU5ERUU7Q049IlNUSE9SRVogU2ViYXN0aWVuIEV4dCBPRi9EU0lGIjtSU1ZQPVRSVUU6bWFpbHRvOnNzdGhvcmV6LmV4dEBvDQoJcmFuZ2UuY29tDQpBVFRFTkRFRTtDTj0iU1RPQ0NISSBDZWNpbGUgRE1HUC9ETU0iO1JTVlA9VFJVRTptYWlsdG86Y2VjaWxlLnN0b2NjaGlAb3JhbmcNCgllLmNvbQ0KQVRURU5ERUU7Q049IlNUUkFVTElOTyBTw6liYXN0aWVuIEFETyI7UlNWUD1UUlVFOm1haWx0bzpzZWJhc3RpZW4uc3RyYXVsaW5vDQoJQG9yYW5nZS5jb20NCkFUVEVOREVFO0NOPSJTWkFSWllOU0tJIEthcmluZSBPRi9EU0lGIjtSU1ZQPVRSVUU6bWFpbHRvOmthcmluZS5zemFyenluc2tpQA0KCW9yYW5nZS5jb20NCkFUVEVOREVFO0NOPSJUQUJBUlkgQWxpbmUgRE1HUCI7UlNWUD1UUlVFOm1haWx0bzphbGluZS50YWJhcnlAb3JhbmdlLmNvbQ0KQVRURU5ERUU7Q049IlRBQlRJLUFCSURBIExheWxhIE9GL0RSQ0dQIjtSU1ZQPVRSVUU6bWFpbHRvOmxheWxhLnRhYnRpYWJpZGFADQoJb3JhbmdlLmNvbQ0KQVRURU5ERUU7Q049IlRIRU9QSElMRSBMdWNpbmRhIERNR1AvRE1NIjtSU1ZQPVRSVUU6bWFpbHRvOmx1Y2luZGEudGhlb3BoaWxlDQoJQG9yYW5nZS5jb20NCkFUVEVOREVFO0NOPSJUT0RPUk9GRi1ERVNNT1VJTExJRVJFUyBGbG9yZW5jZSBPRi9EUkNHUCI7UlNWUD1UUlVFOm1haWx0bzpmbA0KCW9yZW5jZS50b2Rvcm9mZkBvcmFuZ2UuY29tDQpBVFRFTkRFRTtDTj0iVE9VQU1JIFNvbmlhIE9GL0RSQ0dQIjtSU1ZQPVRSVUU6bWFpbHRvOnNvbmlhLnRvdWFtaUBvcmFuZ2UuY28NCgltDQpBVFRFTkRFRTtDTj0iVE9VUkUgUEVHTk9VR08gUGF0cmljaWEgT0YvRFJDR1AiO1JTVlA9VFJVRTptYWlsdG86cGF0cmljaWEudG8NCgl1cmVAb3JhbmdlLmNvbQ0KQVRURU5ERUU7Q049IlRSQU4gRGlldSBMb2MgRE1HUCI7UlNWUD1UUlVFOm1haWx0bzpkaWV1bG9jLnRyYW5Ab3JhbmdlLmNvbQ0KQVRURU5ERUU7Q049IlVORyBCb25hIERNR1AvRE1NIjtSU1ZQPVRSVUU6bWFpbHRvOmJvbmEudW5nQG9yYW5nZS5jb20NCkFUVEVOREVFO0NOPSJVUklPVCBCSUxERVQgVmFsZXJpZSBETUdQIjtSU1ZQPVRSVUU6bWFpbHRvOnZhbGVyaWUudXJpb3RiaWxkZQ0KCXRAb3JhbmdlLmNvbQ0KQVRURU5ERUU7Q049IlZBSUxMQU5UIEFubmUgRFRGL0RFUyI7UlNWUD1UUlVFOm1haWx0bzphbm5lLnZhaWxsYW50QG9yYW5nZS5jDQoJb20NCkFUVEVOREVFO0NOPSJWQU4gT0VSUyBERSBQUkVTVCBMYXVyZSBETUdQL0RNTSI7UlNWUD1UUlVFOm1haWx0bzpsYXVyZS52YW5vZQ0KCXJzQG9yYW5nZS5jb20NCkFUVEVOREVFO0NOPSJWRVJHT1VXRU4gVGhvbWFzIERNR1AvRE1NIjtSU1ZQPVRSVUU6bWFpbHRvOnRob21hcy52ZXJnb3V3ZW5Abw0KCXJhbmdlLmNvbQ0KQVRURU5ERUU7Q049IlZFUklBVVggVmluY2VudCBETUdQL0ROVSI7UlNWUD1UUlVFOm1haWx0bzp2aW5jZW50LnZlcmlhdXhAb3JhDQoJbmdlLmNvbQ0KQVRURU5ERUU7Q049IlZJTEFJTkUgRWxvZGllIERUUlMvRElSTSI7UlNWUD1UUlVFOm1haWx0bzplbG9kaWUudmlsYWluZUBvcmFuDQoJZ2UuY29tDQpBVFRFTkRFRTtDTj0iWVVBTiBUaWFuIE9GL0RTSUYiO1JTVlA9VFJVRTptYWlsdG86dGlhbi55dWFuQG9yYW5nZS5jb20NCkFUVEVOREVFO0NOPSJaQUhSQU1BTkUgSGFzc2FuIE9GL0RTSUYiO1JTVlA9VFJVRTptYWlsdG86aGFzc2FuLnphaHJhbWFuZUBvcg0KCWFuZ2UuY29tDQpBVFRFTkRFRTtDTj0iWkVSUk9VIExvdW5lcyBETUdQIjtSU1ZQPVRSVUU6bWFpbHRvOmxvdW5lcy56ZXJyb3VAb3JhbmdlLmNvbQ0KQVRURU5ERUU7Q049IlpaWiBNT0EiO1JTVlA9VFJVRTptYWlsdG86c2VsZmNhcmUubG9Ab3JhbmdlLmNvbQ0KQVRURU5ERUU7Q049IkdBTFkgRnJhbmNvaXMgRE1HUCI7UlNWUD1UUlVFOm1haWx0bzpmcmFuY29pcy5nYWx5QG9yYW5nZS5jb20NCkFUVEVOREVFO0NOPSJHSUxMSUVSUyBIdWd1ZXMgRE1HUC9ETU0iO1JTVlA9VFJVRTptYWlsdG86aHVndWVzLmdpbGxpZXJzQG9yYQ0KCW5nZS5jb20NCkFUVEVOREVFO0NOPSJHVVNUQVZFIEp1ZGUgRXh0IE9GL0RTSUYiO1JTVlA9VFJVRTptYWlsdG86amd1c3RhdmUuZXh0QG9yYW5nZQ0KCS5jb20NCkFUVEVOREVFO0NOPSJQRVJST1QgQ3lyaWwgRE1HUCI7UlNWUD1UUlVFOm1haWx0bzpjeXJpbC5wZXJyb3RAb3JhbmdlLmNvbQ0KQVRURU5ERUU7Q049IlJPTExBTkQgQW50b255IEV4dCBPRi9EU0lGIjtSU1ZQPVRSVUU6bWFpbHRvOmFyb2xsYW5kLmV4dEBvcmFuDQoJZ2UuY29tDQpBVFRFTkRFRTtDTj0iSVlBQkkgTGF1cmVuY2UgT0YvRFNJRiI7UlNWUD1UUlVFOm1haWx0bzpsYXVyZW5jZS5peWFiaUBvcmFuZ2UNCgkuY29tDQpBVFRFTkRFRTtDTj1mcmFuY2tkYTc1QGdtYWlsLmNvbTtSU1ZQPVRSVUU6bWFpbHRvOmZyYW5ja2RhNzVAZ21haWwuY29tDQpBVFRFTkRFRTtDTj0iRkVOQVlST1UgQW5uZSBFeHQgT0YvRFNJRiI7UlNWUD1UUlVFOm1haWx0bzphZmVuYXlyb3UuZXh0QG9yYW4NCglnZS5jb20NCkFUVEVOREVFO0NOPSJMQVZBQlJFIENsw6ltZW50IE9GL0RTSUYiO1JTVlA9VFJVRTptYWlsdG86Y2xlbWVudC5sYXZhYnJlQG9yYQ0KCW5nZS5jb20NCkFUVEVOREVFO0NOPWNocmlzdG9waGUuY29tYmV0QGdyZWVuLWNvbnNlaWwuY29tO1JTVlA9VFJVRTptYWlsdG86Y2hyaXN0b3BoZQ0KCS5jb21iZXRAZ3JlZW4tY29uc2VpbC5jb20NCkFUVEVOREVFO0NOPW9saXZpZXIudmFuc29uQGdyZWVuLWNvbnNlaWwuY29tO1JTVlA9VFJVRTptYWlsdG86b2xpdmllci52YW5zbw0KCW5AZ3JlZW4tY29uc2VpbC5jb20NCkFUVEVOREVFO0NOPWdlb3JnZXMucm9jY29AZ3JlZW4tY29uc2VpbC5jb207UlNWUD1UUlVFOm1haWx0bzpnZW9yZ2VzLnJvY2NvQA0KCWdyZWVuLWNvbnNlaWwuY29tDQpBVFRFTkRFRTtDTj0iUklWSUVSRSBTdMOpcGhhbmUgRXh0IE9GL0RTSUYiO1JPTEU9T1BULVBBUlRJQ0lQQU5UO1JTVlA9VFJVRToNCgltYWlsdG86c3JpdmllcmUuZXh0QG9yYW5nZS5jb20NCkFUVEVOREVFO0NOPSJBSVJBVUxUIEFybmF1ZCBFeHQgT0YvRFNJRiI7Uk9MRT1PUFQtUEFSVElDSVBBTlQ7UlNWUD1UUlVFOm1haQ0KCWx0bzphcmFpcmF1bHQuZXh0QG9yYW5nZS5jb20NCkFUVEVOREVFO0NOPSJCRU4gREpFTUlBIElidGlzc2VtIEV4dCBPRi9EU0lGIjtST0xFPU9QVC1QQVJUSUNJUEFOVDtSU1ZQPVRSVQ0KCUU6bWFpbHRvOmliZW5kamVtaWEuZXh0QG9yYW5nZS5jb20NCkFUVEVOREVFO0NOPSJIVUlUT1JFTCBGbG9yaW5lIEV4dCBPRi9EU0lGIjtST0xFPU9QVC1QQVJUSUNJUEFOVDtSU1ZQPVRSVUU6bQ0KCWFpbHRvOmZodWl0b3JlbC5leHRAb3JhbmdlLmNvbQ0KQVRURU5ERUU7Q049IlBPVElFUiBTZXJnZSBFeHQgT0YvRFNJRiI7Uk9MRT1PUFQtUEFSVElDSVBBTlQ7UlNWUD1UUlVFOm1haWx0DQoJbzpzcG90aWVyLmV4dEBvcmFuZ2UuY29tDQpBVFRFTkRFRTtDTj0iVkVUVEVSIEJlYXRyaWNlIEV4dCBPRi9EU0lGIjtST0xFPU9QVC1QQVJUSUNJUEFOVDtSU1ZQPVRSVUU6bWENCglpbHRvOmJ2ZXR0ZXIuZXh0QG9yYW5nZS5jb20NCkFUVEVOREVFO0NOPSJNT1VURU5FVCBBZHJpZW4gRE1HUCI7Uk9MRT1PUFQtUEFSVElDSVBBTlQ7UlNWUD1UUlVFOm1haWx0bzphZA0KCXJpZW4ubW91dGVuZXRAb3JhbmdlLmNvbQ0KQ0xBU1M6UFVCTElDDQpDUkVBVEVEOjIwMTQwNDAzVDEzMjIyOFoNCkRFU0NSSVBUSU9OOlF1YW5kIDogbWFyZGkgMjIgYXZyaWwgMjAxNCAxMDowMC0xNzowMCAoR01UKzAxOjAwKSBCcnV4ZWxsZXMsDQoJIENvcGVuaGFndWUsIE1hZHJpZCwgUGFyaXMubkVtcGxhY2VtZW50IDogUG9udCA6IDAxIDU4IDcyIDM1IDE0IC8gQ29vcG4NCglldCA6IGRhb21haSA7IG1kcCA6IDIyMDUyMDE0bm5SZW1hcnF1ZSA6IGxlIGTDqWNhbGFnZSBHTVQgY2ktZGVzc3VzIG5lIA0KCXRpZW50IHBhcyBjb21wdGUgZGVzIHLDqWdsYWdlcyBkZSBsJ2hldXJlIGQnw6l0w6kubm4qfip+Kn4qfip+Kn4qfip+Kn4qDQoJbm5Cb25qb3VyLG5uVm9pY2kgbGVzIGxpZW5zIHByIHZvdXMgY29ubmVjdGVyIMOgIGxhIGNvb3BuZXQgOiBubkJvbmoNCglvdXIsIG5uTm91cyB2b3VzIGNvbmZpcm1vbnMgbGEgcGxhbmlmaWNhdGlvbiBkZSB2b3RyZSBjb25mw6lyZW5jZS4gbk5vDQoJbQlNb3QgZGUgcGFzc2UJTsKwIGRlIHBvbnQJRGF0ZSAoQUFBQS1NTS1KSikJSGV1cmUgZGUgZMOpYnV0CUZ1c2VhdXggaG9yYWkNCglyZQluZGFvbWFpCTIyMDUyMDE0CS0JMjAxNC0wNC0yMgkxMDowMAkoR01UKzAxOjAwKSBCcnV4ZWxsZXMsIENvcGVuaGFndWUNCgksIE1hZHJpZCwgUGFyaXMgKGhldXJlIGQnw6l0w6kpCW5uVm91cyBwb3V2ZXogZm91cm5pciDDoCB2b3MgaW52aXTDqXMgDQoJbGVzIGxpZW5zIHN1aXZhbnRzIHBvdXIgbGV1ciBwZXJtZXR0cmUgZGUgcmVqb2luZHJlIGxhIGNvbmbDqXJlbmNlIGZhY2lsZW0NCgllbnQgZW4gcXVlbHF1ZXMgY2xpY3MgOiBuKglkZXB1aXMgSU5UUkFORVQgOiBjbGlxdWV6IGljaSA8aHR0cHM6Ly9tb25zaS5zDQoJc28uZnJhbmNldGVsZWNvbS5mci9pbmRleC5hc3A/dGFyZ2V0PUhUVFAlM0ElMkYlMkZjb29wbmV0LnNzby5mcmFuY2V0ZWxlY28NCgltLmZyJTJGRGVmYXVsdC5hc3B4JTNmUmV0dXJuVXJsJTNkJTI1MmZEaXJlY3RBY2Nlc3MlMjUyZlN0YXJ0Q29uZmVyZW5jZUJ5VQ0KCXJsLmFzcHglMjUzZmNwSWQlMjUzZEUxM0JBNjE2LUZFRUMtNEE2MC1CNjA1LTYxOEY1OTJCNjk0Nz4gIG4qCWRlcHVpcyBJTlQNCglFUk5FVCA6IGNsaXF1ZXogaWNpIDxodHRwczovL2Nvb3BuZXQubXVsdGltZWRpYS1jb25mZXJlbmNlLm9yYW5nZS1idXNpbmVzcw0KCS5jb20vRGlyZWN0QWNjZXNzL1N0YXJ0Q29uZmVyZW5jZUJ5VXJsLmFzcHg/Y3BJZD1FMTNCQTYxNi1GRUVDLTRBNjAtQjYwNS02DQoJMThGNTkyQjY5NDc+ICBubm5uUmUsbm5MYSBzZWNvbmRlIHLDqXVuaW9uIGRlIERBTyBhdXJhIGJpZW4gbGlldSBsZQ0KCSAyMi8wNCBldCBub24gbGUgMjIvMDUgY29tbWUgbWVudGlvbm7DqSBkYW5zIGxhIDHDqHJlIGludml0YXRpb24gOi0pbm5CaQ0KCWVuIGNkdCxubkF1ZHJleW4NCkRURU5EO1RaSUQ9IlJvbWFuY2UgU3RhbmRhcmQgVGltZSI6MjAxNDA0MjJUMTcwMDAwDQpEVFNUQU1QOjIwMTQwNDExVDA5MjcxNloNCkRUU1RBUlQ7VFpJRD0iUm9tYW5jZSBTdGFuZGFyZCBUaW1lIjoyMDE0MDQyMlQxMDAwMDANCkxBU1QtTU9ESUZJRUQ6MjAxNDA0MjVUMjExOTUxWg0KTE9DQVRJT046UG9udCA6IDAxIDU4IDcyIDM1IDE0IC8gQ29vcG5ldCA6IGRhb21haSA7IG1kcCA6IDIyMDUyMDE0DQpPUkdBTklaRVI7Q049IkJFTExBSUNIRSBBdWRyZXkgRXh0IE9GL0RTSUYiOm1haWx0bzphYmVsbGFpY2hlLmV4dEBvcmFuZ2UuY28NCgltDQpQUklPUklUWTo1DQpTRVFVRU5DRToxDQpTVU1NQVJZO0xBTkdVQUdFPWZyOltUQSAyMiBtYWkgMjAxNF1Sw6l1bmlvbiBkZSBEQU8NClRSQU5TUDpPUEFRVUUNClVJRDowNDAwMDAwMDgyMDBFMDAwNzRDNUI3MTAxQTgyRTAwODAwMDAwMDAwQzA4RkY5OEI1MDRGQ0YwMTAwMDAwMDAwMDAwMDAwMA0KCTAxMDAwMDAwMEJFMUJEM0I1M0I5OUZGNDY4QTY0MEM3MDEyNzlDODczDQpYLUFMVC1ERVNDO0ZNVFRZUEU9dGV4dC9odG1sOjwhRE9DVFlQRSBIVE1MIFBVQkxJQyAiLS8vVzNDLy9EVEQgSFRNTCAzLjIvL0UNCglOIj5uPEhUTUw+bjxIRUFEPm48TUVUQSBOQU1FPSJHZW5lcmF0b3IiIENPTlRFTlQ9Ik1TIEV4Y2hhbmdlIFNlcnZlciB2ZQ0KCXJzaW9uIDE0LjAyLjUwMDQuMDAwIj5uPFRJVExFPjwvVElUTEU+bjwvSEVBRD5uPEJPRFk+bjwhLS0gQ29udmVydGVkIGYNCglyb20gdGV4dC9ydGYgZm9ybWF0IC0tPm5uPFAgRElSPUxUUj48U1BBTiBMQU5HPSJmciI+PEZPTlQgRkFDRT0iQ2FsaWJyaSINCgk+UXVhbmQgOiBtYXJkaSAyMiBhdnJpbCAyMDE0IDEwOjAwLTE3OjAwIChHTVQrMDE6MDApIEJydXhlbGxlcywgQ29wZW5oYWd1DQoJZSwgTWFkcmlkLCBQYXJpcy48L0ZPTlQ+PC9TUEFOPjwvUD5ubjxQIERJUj1MVFI+PFNQQU4gTEFORz0iZnIiPjxGT05UIA0KCUZBQ0U9IkNhbGlicmkiPkVtcGxhY2VtZW50IDogUG9udCA6IDAxIDU4IDcyIDM1IDE0IC8gQ29vcG5ldCA6IGRhb21haSA7IG0NCglkcCA6IDIyMDUyMDE0PC9GT05UPjwvU1BBTj48L1A+bm48UCBESVI9TFRSPjxTUEFOIExBTkc9ImZyIj48Rk9OVCBGQUNFPSINCglDYWxpYnJpIj5SZW1hcnF1ZSA6IGxlIGTDqWNhbGFnZSBHTVQgY2ktZGVzc3VzIG5lIHRpZW50IHBhcyBjb21wdGUgZGVzIHLDqQ0KCWdsYWdlcyBkZSBsJ2hldXJlIGQnw6l0w6kuPC9GT05UPjwvU1BBTj48L1A+bm48UCBESVI9TFRSPjxTUEFOIExBTkc9ImZyIg0KCT48Rk9OVCBGQUNFPSJDYWxpYnJpIj4qfip+Kn4qfip+Kn4qfip+Kn4qPC9GT05UPjwvU1BBTj48L1A+bm48UCBESVI9TFRSPg0KCTxTUEFOIExBTkc9ImZyIj48L1NQQU4+PFNQQU4gTEFORz0iZnIiPjwvU1BBTj48U1BBTiBMQU5HPSJmciI+PEZPTlQgU0laRT0yDQoJIEZBQ0U9IlRyZWJ1Y2hldCBNUyI+Qm9uam91ciw8L0ZPTlQ+PC9TUEFOPjwvUD5ubjxQIERJUj1MVFI+PFNQQU4gTEFORz0NCgkiZnIiPjxGT05UIFNJWkU9MiBGQUNFPSJUcmVidWNoZXQgTVMiPlZvaWNpIGxlcyBsaWVucyBwciB2b3VzIGNvbm5lY3RlciDDoA0KCSBsYSBjb29wbmV0wqA6IDwvRk9OVD48L1NQQU4+PC9QPm5uPFAgRElSPUxUUj48U1BBTiBMQU5HPSJmciI+PC9TUEFOPjxTUA0KCUFOIExBTkc9ImZyIj48L1NQQU4+PFNQQU4gTEFORz0iZnIiPjxGT05UIFNJWkU9MiBGQUNFPSJBcmlhbCI+Qm9uam91ciw8QlINCgk+bjxCUj5uTm91cyB2b3VzIGNvbmZpcm1vbnMgbGEgcGxhbmlmaWNhdGlvbiBkZSB2b3RyZSBjb25mw6lyZW5jZS4gPC9GT04NCglUPjwvU1BBTj48L1A+bm48UCBESVI9TFRSIEFMSUdOPUNFTlRFUj48U1BBTiBMQU5HPSJmciI+PEI+PEZPTlQgRkFDRT0iQ2ENCglsaWJyaSI+Tm9tPC9GT05UPjwvQj48L1NQQU4+PFNQQU4gTEFORz0iZnIiPjxCPjwvQj48L1NQQU4+PFNQQU4gTEFORz0iZnIiPg0KCTxCPiZuYnNwOyZuYnNwOyZuYnNwOyZuYnNwOzwvQj48L1NQQU4+PFNQQU4gTEFORz0iZnIiPjxCPiA8Rk9OVCBGQUNFPSINCglDYWxpYnJpIj5Nb3QgZGUgcGFzc2U8L0ZPTlQ+PC9CPjwvU1BBTj48U1BBTiBMQU5HPSJmciI+PEI+PC9CPjwvU1BBTj48U1BBTg0KCSBMQU5HPSJmciI+PEI+Jm5ic3A7Jm5ic3A7Jm5ic3A7PC9CPjwvU1BBTj48U1BBTiBMQU5HPSJmciI+PEI+IDxGT05UIEZBDQoJQ0U9IkNhbGlicmkiPk7CsCBkZSBwb250PC9GT05UPjwvQj48L1NQQU4+PFNQQU4gTEFORz0iZnIiPjxCPjwvQj48L1NQQU4+PFMNCglQQU4gTEFORz0iZnIiPjxCPiZuYnNwOyZuYnNwOyZuYnNwOyZuYnNwOyZuYnNwOzwvQj48L1NQQU4+PFNQQU4gTEFORz0NCgkiZnIiPjxCPiA8Rk9OVCBGQUNFPSJDYWxpYnJpIj5EYXRlIChBQUFBLU1NLUpKKTwvRk9OVD48L0I+PC9TUEFOPjxTUEFOIExBTg0KCUc9ImZyIj48Qj48L0I+PC9TUEFOPjxTUEFOIExBTkc9ImZyIj48Qj4mbmJzcDsmbmJzcDsmbmJzcDsmbmJzcDsmbmJzcA0KCTsmbmJzcDs8L0I+PC9TUEFOPjxTUEFOIExBTkc9ImZyIj48Qj4gPEZPTlQgRkFDRT0iQ2FsaWJyaSI+SGV1cmUgZGUgZMOpYnUNCgl0PC9GT05UPjwvQj48L1NQQU4+PFNQQU4gTEFORz0iZnIiPjxCPjwvQj48L1NQQU4+PFNQQU4gTEFORz0iZnIiPjxCPiZuYnNwDQoJOzwvQj48L1NQQU4+PFNQQU4gTEFORz0iZnIiPjxCPiA8Rk9OVCBGQUNFPSJDYWxpYnJpIj5GdXNlYXV4IGhvcmFpcmU8L0ZPTlQNCgk+PC9CPjwvU1BBTj48U1BBTiBMQU5HPSJmciI+PEI+PC9CPjwvU1BBTj48U1BBTiBMQU5HPSJmciI+PEI+PC9CPjwvU1BBTj48Uw0KCVBBTiBMQU5HPSJmciI+PC9TUEFOPjxTUEFOIExBTkc9ImZyIj48QlI+bjwvU1BBTj48U1BBTiBMQU5HPSJmciI+PEZPTlQgRkENCglDRT0iQ2FsaWJyaSI+ZGFvbWFpPC9GT05UPjwvU1BBTj48U1BBTiBMQU5HPSJmciI+PC9TUEFOPjxTUEFOIExBTkc9ImZyIj4mbg0KCWJzcDs8L1NQQU4+PFNQQU4gTEFORz0iZnIiPiA8Rk9OVCBGQUNFPSJDYWxpYnJpIj4yMjA1MjAxNDwvRk9OVD48L1NQQU4+PFMNCglQQU4gTEFORz0iZnIiPjwvU1BBTj48U1BBTiBMQU5HPSJmciI+Jm5ic3A7Jm5ic3A7Jm5ic3A7Jm5ic3A7Jm5ic3A7Jm4NCglic3A7Jm5ic3A7PC9TUEFOPjxTUEFOIExBTkc9ImZyIj4gPEZPTlQgRkFDRT0iQ2FsaWJyaSI+LTwvRk9OVD48L1NQQU4+PFMNCglQQU4gTEFORz0iZnIiPjwvU1BBTj48U1BBTiBMQU5HPSJmciI+Jm5ic3A7Jm5ic3A7Jm5ic3A7Jm5ic3A7Jm5ic3A7Jm4NCglic3A7PC9TUEFOPjxTUEFOIExBTkc9ImZyIj4gPEZPTlQgRkFDRT0iQ2FsaWJyaSI+MjAxNC0wNC0yMjwvRk9OVD48L1NQQU4+DQoJPFNQQU4gTEFORz0iZnIiPjwvU1BBTj48U1BBTiBMQU5HPSJmciI+Jm5ic3A7Jm5ic3A7Jm5ic3A7Jm5ic3A7Jm5ic3A7DQoJPC9TUEFOPjxTUEFOIExBTkc9ImZyIj4gPEZPTlQgRkFDRT0iQ2FsaWJyaSI+MTA6MDA8L0ZPTlQ+PC9TUEFOPjxTUEFOIExBTkcNCgk9ImZyIj48L1NQQU4+PFNQQU4gTEFORz0iZnIiPiZuYnNwOyZuYnNwOzwvU1BBTj48U1BBTiBMQU5HPSJmciI+IDxGT05UIEYNCglBQ0U9IkNhbGlicmkiPihHTVQrMDE6MDApIEJydXhlbGxlcywgQ29wZW5oYWd1ZSwgTWFkcmlkLCBQYXJpcyAoaGV1cmUgZA0KCSfDqXTDqSk8L0ZPTlQ+PC9TUEFOPjxTUEFOIExBTkc9ImZyIj48L1NQQU4+PFNQQU4gTEFORz0iZnIiPiZuYnNwOzwvU1BBTj4NCgk8U1BBTiBMQU5HPSJmciI+PC9TUEFOPjxTUEFOIExBTkc9ImZyIj48QlI+bjwvU1BBTj48U1BBTiBMQU5HPSJmciI+PC9TUEFODQoJPjxTUEFOIExBTkc9ImZyIj48L1NQQU4+PFNQQU4gTEFORz0iZnIiPjxCUj5uPEZPTlQgU0laRT0yIEZBQ0U9IkFyaWFsIj5Wbw0KCXVzIHBvdXZleiBmb3VybmlyIMOgIHZvcyBpbnZpdMOpcyBsZXMgbGllbnMgc3VpdmFudHMgcG91ciBsZXVyIHBlcm1ldHRyZSBkDQoJZSByZWpvaW5kcmUgbGEgY29uZsOpcmVuY2UgZmFjaWxlbWVudCBlbiBxdWVscXVlcyBjbGljcyA6IDwvRk9OVD48L1NQQU4+PC8NCglQPm5uPFAgRElSPUxUUj48U1BBTiBMQU5HPSJmciI+PEZPTlQgU0laRT0yIEZBQ0U9IlN5bWJvbCI+JiMxODM7PEZPTlQgRg0KCUFDRT0iQ291cmllciBOZXciPiZuYnNwOyZuYnNwOyZuYnNwOyZuYnNwOyZuYnNwOyZuYnNwOzwvRk9OVD48L0ZPTlQ+DQoJPC9TUEFOPjxTUEFOIExBTkc9ImZyIj48L1NQQU4+PFNQQU4gTEFORz0iZnIiPjwvU1BBTj48U1BBTiBMQU5HPSJmciI+IDxGT04NCglUIFNJWkU9MiBGQUNFPSJBcmlhbCI+ZGVwdWlzIElOVFJBTkVUIDo8L0ZPTlQ+PC9TUEFOPjxTUEFOIExBTkc9ImZyIj4gPC9TUA0KCUFOPjxBIEhSRUY9Imh0dHBzOi8vbW9uc2kuc3NvLmZyYW5jZXRlbGVjb20uZnIvaW5kZXguYXNwP3RhcmdldD1IVFRQJTNBJTJGDQoJJTJGY29vcG5ldC5zc28uZnJhbmNldGVsZWNvbS5mciUyRkRlZmF1bHQuYXNweCUzZlJldHVyblVybCUzZCUyNTJmRGlyZWN0QWMNCgljZXNzJTI1MmZTdGFydENvbmZlcmVuY2VCeVVybC5hc3B4JTI1M2ZjcElkJTI1M2RFMTNCQTYxNi1GRUVDLTRBNjAtQjYwNS02MQ0KCThGNTkyQjY5NDciPjxTUEFOIExBTkc9ImZyIj48L1NQQU4+PFNQQU4gTEFORz0iZnIiPjwvU1BBTj48U1BBTiBMQU5HPSJmciI+DQoJPFU+PEZPTlQgQ09MT1I9IiMwMDAwRkYiIFNJWkU9MiBGQUNFPSJBcmlhbCI+Y2xpcXVleiBpY2k8L0ZPTlQ+PC9VPjwvU1BBTj4NCgk8U1BBTiBMQU5HPSJmciI+PC9TUEFOPjwvQT48U1BBTiBMQU5HPSJmciI+PC9TUEFOPjxTUEFOIExBTkc9ImZyIj48L1NQQU4+PA0KCVNQQU4gTEFORz0iZnIiPjxGT05UIFNJWkU9MiBGQUNFPSJBcmlhbCI+IDwvRk9OVD48L1NQQU4+PC9QPm5uPFAgRElSPUxUUg0KCT48U1BBTiBMQU5HPSJmciI+PEZPTlQgU0laRT0yIEZBQ0U9IlN5bWJvbCI+JiMxODM7PEZPTlQgRkFDRT0iQ291cmllciBOZXcNCgkiPiZuYnNwOyZuYnNwOyZuYnNwOyZuYnNwOyZuYnNwOyZuYnNwOzwvRk9OVD48L0ZPTlQ+IDxGT05UIFNJWkU9MiBGQQ0KCUNFPSJBcmlhbCI+ZGVwdWlzIElOVEVSTkVUIDo8L0ZPTlQ+PC9TUEFOPjxTUEFOIExBTkc9ImZyIj4gPC9TUEFOPjxBIEhSRUY9DQoJImh0dHBzOi8vY29vcG5ldC5tdWx0aW1lZGlhLWNvbmZlcmVuY2Uub3JhbmdlLWJ1c2luZXNzLmNvbS9EaXJlY3RBY2Nlc3MvU3QNCglhcnRDb25mZXJlbmNlQnlVcmwuYXNweD9jcElkPUUxM0JBNjE2LUZFRUMtNEE2MC1CNjA1LTYxOEY1OTJCNjk0NyI+PFNQQU4gTA0KCUFORz0iZnIiPjwvU1BBTj48U1BBTiBMQU5HPSJmciI+PC9TUEFOPjxTUEFOIExBTkc9ImZyIj48VT48Rk9OVCBDT0xPUj0iIzAwDQoJMDBGRiIgU0laRT0yIEZBQ0U9IkFyaWFsIj5jbGlxdWV6IGljaTwvRk9OVD48L1U+PC9TUEFOPjxTUEFOIExBTkc9ImZyIj48L1MNCglQQU4+PC9BPjxTUEFOIExBTkc9ImZyIj48L1NQQU4+PFNQQU4gTEFORz0iZnIiPjwvU1BBTj48U1BBTiBMQU5HPSJmciI+PEZPTg0KCVQgU0laRT0yIEZBQ0U9IkFyaWFsIj4gPC9GT05UPjwvU1BBTj48L1A+bm48UCBESVI9TFRSPjxTUEFOIExBTkc9ImZyIj48Lw0KCVNQQU4+PFNQQU4gTEFORz0iZnIiPjwvU1BBTj48U1BBTiBMQU5HPSJmciI+PC9TUEFOPjwvUD5uPEJSPm5uPFAgRElSPUxUDQoJUj48U1BBTiBMQU5HPSJmciI+PEZPTlQgU0laRT0yIEZBQ0U9IlRyZWJ1Y2hldCBNUyI+UmUsPC9GT05UPjwvU1BBTj48L1A+DQoJbm48UCBESVI9TFRSPjxTUEFOIExBTkc9ImZyIj48Rk9OVCBTSVpFPTIgRkFDRT0iVHJlYnVjaGV0IE1TIj5MYSBzZWNvbmRlIA0KCXLDqXVuaW9uIGRlIERBTyBhdXJhIGJpZW4gbGlldSBsZSAyMi8wNCBldCBub24gbGUgMjIvMDUgY29tbWUgbWVudGlvbm7DqSBkDQoJYW5zIGxhIDE8L0ZPTlQ+PC9TUEFOPjxTUEFOIExBTkc9ImZyIj48L1NQQU4+PFNQQU4gTEFORz0iZnIiPjwvU1BBTj48U1BBTiANCglMQU5HPSJmciI+PFNVUD48Rk9OVCBTSVpFPTIgRkFDRT0iVHJlYnVjaGV0IE1TIj7DqHJlPC9GT05UPjwvU1VQPjwvU1BBTj48Uw0KCVBBTiBMQU5HPSJmciI+PC9TUEFOPjxTUEFOIExBTkc9ImZyIj48L1NQQU4+PFNQQU4gTEFORz0iZnIiPjxGT05UIFNJWkU9MiBGDQoJQUNFPSJUcmVidWNoZXQgTVMiPiBpbnZpdGF0aW9uwqA8L0ZPTlQ+PC9TUEFOPjxTUEFOIExBTkc9ImZyIj48L1NQQU4+PFNQQU4NCgkgTEFORz0iZnIiPjwvU1BBTj48U1BBTiBMQU5HPSJmciI+PEZPTlQgRkFDRT0iV2luZ2RpbmdzIiBTSVpFPTI+SjwvRk9OVD48Lw0KCVNQQU4+PFNQQU4gTEFORz0iZnIiPjwvU1BBTj48U1BBTiBMQU5HPSJmciI+PC9TUEFOPjxTUEFOIExBTkc9ImZyIj48L1NQQU4+DQoJPC9QPm5uPFAgRElSPUxUUj48U1BBTiBMQU5HPSJmciI+PEZPTlQgU0laRT0yIEZBQ0U9IlRyZWJ1Y2hldCBNUyI+QmllbiBjDQoJZHQsPC9GT05UPjwvU1BBTj48L1A+bm48UCBESVI9TFRSPjxTUEFOIExBTkc9ImZyIj48Rk9OVCBTSVpFPTIgRkFDRT0iVHINCgllYnVjaGV0IE1TIj5BdWRyZXk8L0ZPTlQ+PC9TUEFOPjxTUEFOIExBTkc9ImZyIj48L1NQQU4+PFNQQU4gTEFORz0iZnIiPjwvUw0KCVBBTj48U1BBTiBMQU5HPSJmciI+PC9TUEFOPjwvUD5ubjwvQk9EWT5uPC9IVE1MPg0KWC1NSUNST1NPRlQtQ0RPLUJVU1lTVEFUVVM6VEVOVEFUSVZFDQpYLU1JQ1JPU09GVC1DRE8tSU1QT1JUQU5DRToxDQpYLU1JQ1JPU09GVC1ESVNBTExPVy1DT1VOVEVSOkZBTFNFDQpYLU1TLU9MSy1BUFBUTEFTVFNFUVVFTkNFOjENClgtTVMtT0xLLUFQUFRTRVFUSU1FOjIwMTQwNDAzVDEzMjIzOFoNClgtTVMtT0xLLUNPTkZUWVBFOjANCkVORDpWRVZFTlQNCkJFR0lOOlZFVkVOVA0KQVRURU5ERUU7Q049IkZFTkFZUk9VIEFubmUgRXh0IE9GL0RTSUYiO1JTVlA9VFJVRTptYWlsdG86YWZlbmF5cm91LmV4dEBvcmFuDQoJZ2UuY29tDQpBVFRFTkRFRTtDTj0iTEFWQUJSRSBDbMOpbWVudCBPRi9EU0lGIjtSU1ZQPVRSVUU6bWFpbHRvOmNsZW1lbnQubGF2YWJyZUBvcmENCgluZ2UuY29tDQpBVFRFTkRFRTtDTj1jaHJpc3RvcGhlLmNvbWJldEBncmVlbi1jb25zZWlsLmNvbTtSU1ZQPVRSVUU6bWFpbHRvOmNocmlzdG9waGUNCgkuY29tYmV0QGdyZWVuLWNvbnNlaWwuY29tDQpBVFRFTkRFRTtDTj1vbGl2aWVyLnZhbnNvbkBncmVlbi1jb25zZWlsLmNvbTtSU1ZQPVRSVUU6bWFpbHRvOm9saXZpZXIudmFuc28NCgluQGdyZWVuLWNvbnNlaWwuY29tDQpBVFRFTkRFRTtDTj1nZW9yZ2VzLnJvY2NvQGdyZWVuLWNvbnNlaWwuY29tO1JTVlA9VFJVRTptYWlsdG86Z2Vvcmdlcy5yb2Njb0ANCglncmVlbi1jb25zZWlsLmNvbQ0KQ0xBU1M6UFVCTElDDQpDUkVBVEVEOjIwMTQwNDE2VDA5MDMwNloNCkRFU0NSSVBUSU9OOkJvbmpvdXIsIG5uQWxleGlzIGV0IG1vaS1tw6ptZSB2b3VzIHByb3Bvc29ucyBjZSBjcsOpbmVhdSBwbw0KCXVyIHBhcmNvdXJpciBlbnNlbWJsZSBsZSBzY29wZSBkdSB0ZW1wcyBkJ2FuaW1hdGlvbiBkdSAyMiBtYWkgcG91ciBsJ3VuaXZlDQoJcnMgc29zaCBtb2JpbGUgZXQgc29zaCBtb2JpbGUrbGl2ZWJveCwgdHJhbnNtaXMgY2Ugam91ci5ubk4uQiA6IGxlIGRvY3UNCgltZW50IHNlIHRyb3V2ZSBpY2kgOiBodHRwOi8vc2hwLml0bi5mdGdyb3VwL3NpdGVzL0xPTW9iaWxlT25saW5lLzIwMTQlMjAlMg0KCTBzYWlzb24lMjAyL3VuaXZlcnMlMjBzb3NoL1Njb3BlX1NhaXNvbl9EQ09MX1VuaXZlcnNfU29zaF9TYWlzb24yX1RBMl8yMm1hDQoJaTIwMTRfdjAuMi5wcHR4IG5uTm91cyBmZXJvbnMgY2VsYSBwYXIgdMOpbMOpcGhvbmUgZXQgdmlhIGNvb3BuZXQgOm5Ob20NCgkJTW90IGRlIHBhc3NlCU7CsCBkZSBwb250CURhdGUgKEFBQUEtTU0tSkopCUhldXJlIGRlIGTDqWJ1dAlGdXNlYXV4IGhvcmFpcg0KCWUJblRBMjJtYWkyMDE0CXVuaXZlcnNzb3NoCSszMyAxIDU4IDcyIDYyIDM3CTIwMTQtMDQtMTcJMTY6MDAJKEdNVCswMTowMCkNCgkgQnJ1eGVsbGVzLCBDb3BlbmhhZ3VlLCBNYWRyaWQsIFBhcmlzIChoZXVyZSBkJ8OpdMOpKQlublZvdXMgcG91dmV6IGYNCglvdXJuaXIgw6Agdm9zIGludml0w6lzIGxlcyBsaWVucyBzdWl2YW50cyBwb3VyIGxldXIgcGVybWV0dHJlIGRlIHJlam9pbmRyZQ0KCSBsYSBjb25mw6lyZW5jZSBmYWNpbGVtZW50IGVuIHF1ZWxxdWVzIGNsaWNzIDogbioJZGVwdWlzIElOVFJBTkVUIDogY2xpcXUNCglleiBpY2kgPGh0dHBzOi8vbW9uc2kuc3NvLmZyYW5jZXRlbGVjb20uZnIvaW5kZXguYXNwP3RhcmdldD1IVFRQJTNBJTJGJTJGYw0KCW9vcG5ldC5zc28uZnJhbmNldGVsZWNvbS5mciUyRkRlZmF1bHQuYXNweCUzZlJldHVyblVybCUzZCUyNTJmRGlyZWN0QWNjZXNzDQoJJTI1MmZTdGFydENvbmZlcmVuY2VCeVVybC5hc3B4JTI1M2ZjcElkJTI1M2RBNTEwOTEzOC0yMEYzLTRCMTYtODc3Qy1BNTg2NDANCgkzMzZCOTY+ICBuKglkZXB1aXMgSU5URVJORVQgOiBjbGlxdWV6IGljaSA8aHR0cHM6Ly9jb29wbmV0Lm11bHRpbWVkaWEtY29uDQoJZmVyZW5jZS5vcmFuZ2UtYnVzaW5lc3MuY29tL0RpcmVjdEFjY2Vzcy9TdGFydENvbmZlcmVuY2VCeVVybC5hc3B4P2NwSWQ9QTUNCgkxMDkxMzgtMjBGMy00QjE2LTg3N0MtQTU4NjQwMzM2Qjk2PiAgbm5Db3JkaWFsZW1lbnQsIG5BbGV4aXMgZXQgRGF2aWQNCglublVuZSBwZW5zw6llIMOpY29sbyA6ICBuJ2ltcHJpbWV6IHF1ZSBzaSBuw6ljZXNzYWlyZSwgc3ZwLiBubm5uDQpEVEVORDtUWklEPSJSb21hbmNlIFN0YW5kYXJkIFRpbWUiOjIwMTQwNDE3VDE3MDAwMA0KRFRTVEFNUDoyMDE0MDQxNlQwOTAyNTVaDQpEVFNUQVJUO1RaSUQ9IlJvbWFuY2UgU3RhbmRhcmQgVGltZSI6MjAxNDA0MTdUMTYwMDAwDQpMQVNULU1PRElGSUVEOjIwMTQwNDI1VDIxMTk1MVoNCkxPQ0FUSU9OOjAxIDU4IDcyIDYyIDM3ICsgY29vcG5ldA0KT1JHQU5JWkVSO0NOPSJNQVRISUVVIERhdmlkIE9GL0RSQ0dQIjptYWlsdG86ZGF2aWQubWF0aGlldUBvcmFuZ2UuY29tDQpQUklPUklUWTo1DQpTRVFVRU5DRTowDQpTVU1NQVJZO0xBTkdVQUdFPWZyOltUQSAyMiBtYWkgMjAxNF0gc2NvcGUgc29zaCBtb2JpbGUgZXQgc29zaCBtb2JpbGUrbGl2ZWINCglveA0KVFJBTlNQOk9QQVFVRQ0KVUlEOjA0MDAwMDAwODIwMEUwMDA3NEM1QjcxMDFBODJFMDA4MDAwMDAwMDAzMERGMENCM0Q0NThDRjAxMDAwMDAwMDAwMDAwMDAwDQoJMDEwMDAwMDAwOUY4NEM3NjdENEEyOEE0NzlFQ0E0RDAxMjE4OTJDMDENClgtQUxULURFU0M7Rk1UVFlQRT10ZXh0L2h0bWw6PCFET0NUWVBFIEhUTUwgUFVCTElDICItLy9XM0MvL0RURCBIVE1MIDMuMi8vRQ0KCU4iPm48SFRNTD5uPEhFQUQ+bjxNRVRBIE5BTUU9IkdlbmVyYXRvciIgQ09OVEVOVD0iTVMgRXhjaGFuZ2UgU2VydmVyIHZlDQoJcnNpb24gMTQuMDIuNTAwNC4wMDAiPm48VElUTEU+PC9USVRMRT5uPC9IRUFEPm48Qk9EWT5uPCEtLSBDb252ZXJ0ZWQgZg0KCXJvbSB0ZXh0L3J0ZiBmb3JtYXQgLS0+bm48UCBESVI9TFRSPjxTUEFOIExBTkc9ImZyIj48Rk9OVCBGQUNFPSJDYWxpYnJpIg0KCT5Cb25qb3VyLCA8L0ZPTlQ+PC9TUEFOPjwvUD5ubjxQIERJUj1MVFI+PFNQQU4gTEFORz0iZnIiPjxGT05UIEZBQ0U9IkNhDQoJbGlicmkiPkFsZXhpcyBldCBtb2ktbcOqbWUgdm91cyBwcm9wb3NvbnM8L0ZPTlQ+PC9TUEFOPjxTUEFOIExBTkc9ImZyIj48Rk8NCglOVCBGQUNFPSJDYWxpYnJpIj4gY2UgY3LDqW5lYXUgcG91ciBwYXJjb3VyaXIgZW5zZW1ibGUgbGUgc2NvcGUgZHUgdGVtcHMgZA0KCSdhbmltYXRpb24gZHUgMjIgbWFpIHBvdXIgbCd1bml2ZXJzPC9GT05UPjwvU1BBTj48U1BBTiBMQU5HPSJmciI+IDxGT05UIEZBDQoJQ0U9IkNhbGlicmkiPnNvc2ggbW9iaWxlIGV0IHNvc2ggbW9iaWxlK2xpdmVib3gsPC9GT05UPjwvU1BBTj48U1BBTiBMQU5HPQ0KCSJmciI+PEZPTlQgRkFDRT0iQ2FsaWJyaSI+IHRyYW5zbWlzIGNlIGpvdXIuPC9GT05UPjwvU1BBTj48L1A+bm48UCBESVI9TA0KCVRSPjxTUEFOIExBTkc9ImZyIj48Rk9OVCBGQUNFPSJDYWxpYnJpIj5OLkIgOiBsZSBkb2N1bWVudCBzZSB0cm91dmUgaWNpIDo8DQoJL0ZPTlQ+PC9TUEFOPjxTUEFOIExBTkc9ImZyIj4gPC9TUEFOPjxBIEhSRUY9Imh0dHA6Ly9zaHAuaXRuLmZ0Z3JvdXAvc2l0ZXMNCgkvTE9Nb2JpbGVPbmxpbmUvMjAxNCUyMCUyMHNhaXNvbiUyMDIvdW5pdmVycyUyMHNvc2gvU2NvcGVfU2Fpc29uX0RDT0xfVW5pdg0KCWVyc19Tb3NoX1NhaXNvbjJfVEEyXzIybWFpMjAxNF92MC4yLnBwdHgiPjxTUEFOIExBTkc9ImZyIj48VT48Rk9OVCBDT0xPUj0iDQoJIzAwMDBGRiIgRkFDRT0iQ2FsaWJyaSI+aHR0cDovL3NocC5pdG4uZnRncm91cC9zaXRlcy9MT01vYmlsZU9ubGluZS8yMDE0JTINCgkwJTIwc2Fpc29uJTIwMi91bml2ZXJzJTIwc29zaC9TY29wZV9TYWlzb25fRENPTF9Vbml2ZXJzX1Nvc2hfU2Fpc29uMl9UQTJfMg0KCTJtYWkyMDE0X3YwLjIucHB0eDwvRk9OVD48L1U+PC9TUEFOPjxTUEFOIExBTkc9ImZyIj48L1NQQU4+PC9BPjxTUEFOIExBTkc9DQoJImZyIj48Rk9OVCBGQUNFPSJDYWxpYnJpIj48L0ZPTlQ+PC9TUEFOPjxTUEFOIExBTkc9ImZyIj4gPC9TUEFOPjwvUD5ubjxQDQoJIERJUj1MVFI+PFNQQU4gTEFORz0iZnIiPjxGT05UIEZBQ0U9IkNhbGlicmkiPk5vdXMgZmVyb25zIGNlbGEgcGFyIHTDqWzDqXANCglob25lIGV0IHZpYSBjb29wbmV0IDo8L0ZPTlQ+PC9TUEFOPjwvUD5ubjxQIERJUj1MVFIgQUxJR049Q0VOVEVSPjxTUEFOIEwNCglBTkc9ImZyIj48Qj48Rk9OVCBGQUNFPSJDYWxpYnJpIj5Ob208L0ZPTlQ+PC9CPjwvU1BBTj48U1BBTiBMQU5HPSJmciI+PEI+PA0KCS9CPjwvU1BBTj48U1BBTiBMQU5HPSJmciI+PEI+Jm5ic3A7Jm5ic3A7Jm5ic3A7Jm5ic3A7PC9CPjwvU1BBTj48U1BBTiANCglMQU5HPSJmciI+PEI+IDxGT05UIEZBQ0U9IkNhbGlicmkiPk1vdCBkZSBwYXNzZTwvRk9OVD48L0I+PC9TUEFOPjxTUEFOIExBTg0KCUc9ImZyIj48Qj48L0I+PC9TUEFOPjxTUEFOIExBTkc9ImZyIj48Qj4mbmJzcDsmbmJzcDsmbmJzcDs8L0I+PC9TUEFOPjxTDQoJUEFOIExBTkc9ImZyIj48Qj4gPEZPTlQgRkFDRT0iQ2FsaWJyaSI+TsKwIGRlIHBvbnQ8L0ZPTlQ+PC9CPjwvU1BBTj48U1BBTiANCglMQU5HPSJmciI+PEI+PC9CPjwvU1BBTj48U1BBTiBMQU5HPSJmciI+PEI+Jm5ic3A7Jm5ic3A7Jm5ic3A7Jm5ic3A7Jm5iDQoJc3A7PC9CPjwvU1BBTj48U1BBTiBMQU5HPSJmciI+PEI+IDxGT05UIEZBQ0U9IkNhbGlicmkiPkRhdGUgKEFBQUEtTU0tSkopPA0KCS9GT05UPjwvQj48L1NQQU4+PFNQQU4gTEFORz0iZnIiPjxCPjwvQj48L1NQQU4+PFNQQU4gTEFORz0iZnIiPjxCPiZuYnNwOyYNCgluYnNwOyZuYnNwOyZuYnNwOyZuYnNwOyZuYnNwOzwvQj48L1NQQU4+PFNQQU4gTEFORz0iZnIiPjxCPiA8Rk9OVCBGQUMNCglFPSJDYWxpYnJpIj5IZXVyZSBkZSBkw6lidXQ8L0ZPTlQ+PC9CPjwvU1BBTj48U1BBTiBMQU5HPSJmciI+PEI+PC9CPjwvU1BBTg0KCT48U1BBTiBMQU5HPSJmciI+PEI+Jm5ic3A7PC9CPjwvU1BBTj48U1BBTiBMQU5HPSJmciI+PEI+IDxGT05UIEZBQ0U9IkNhbGkNCglicmkiPkZ1c2VhdXggaG9yYWlyZTwvRk9OVD48L0I+PC9TUEFOPjxTUEFOIExBTkc9ImZyIj48Qj48L0I+PC9TUEFOPjxTUEFOIA0KCUxBTkc9ImZyIj48Qj48L0I+PC9TUEFOPjxTUEFOIExBTkc9ImZyIj48L1NQQU4+PFNQQU4gTEFORz0iZnIiPjxCUj5uPC9TUEENCglOPjxTUEFOIExBTkc9ImZyIj48Rk9OVCBGQUNFPSJDYWxpYnJpIj5UQTIybWFpMjAxNDwvRk9OVD48L1NQQU4+PFNQQU4gTEFORw0KCT0iZnIiPjwvU1BBTj48U1BBTiBMQU5HPSJmciI+Jm5ic3A7Jm5ic3A7Jm5ic3A7Jm5ic3A7PC9TUEFOPjxTUEFOIExBTkcNCgk9ImZyIj4gPEZPTlQgRkFDRT0iQ2FsaWJyaSI+dW5pdmVyc3Nvc2g8L0ZPTlQ+PC9TUEFOPjxTUEFOIExBTkc9ImZyIj48L1NQQQ0KCU4+PFNQQU4gTEFORz0iZnIiPiZuYnNwOyZuYnNwOyZuYnNwOyZuYnNwOzwvU1BBTj48U1BBTiBMQU5HPSJmciI+IDxGT04NCglUIEZBQ0U9IkNhbGlicmkiPiszMyAxIDU4IDcyIDYyIDM3PC9GT05UPjwvU1BBTj48U1BBTiBMQU5HPSJmciI+PC9TUEFOPjxTUA0KCUFOIExBTkc9ImZyIj4mbmJzcDsmbmJzcDsmbmJzcDsmbmJzcDsmbmJzcDsmbmJzcDs8L1NQQU4+PFNQQU4gTEFORz0iDQoJZnIiPiA8Rk9OVCBGQUNFPSJDYWxpYnJpIj4yMDE0LTA0LTE3PC9GT05UPjwvU1BBTj48U1BBTiBMQU5HPSJmciI+PC9TUEFOPjwNCglTUEFOIExBTkc9ImZyIj4mbmJzcDsmbmJzcDsmbmJzcDsmbmJzcDsmbmJzcDs8L1NQQU4+PFNQQU4gTEFORz0iZnIiPiANCgk8Rk9OVCBGQUNFPSJDYWxpYnJpIj4xNjowMDwvRk9OVD48L1NQQU4+PFNQQU4gTEFORz0iZnIiPjwvU1BBTj48U1BBTiBMQU5HPQ0KCSJmciI+Jm5ic3A7Jm5ic3A7PC9TUEFOPjxTUEFOIExBTkc9ImZyIj4gPEZPTlQgRkFDRT0iQ2FsaWJyaSI+KEdNVCswMTowMA0KCSkgQnJ1eGVsbGVzLCBDb3BlbmhhZ3VlLCBNYWRyaWQsIFBhcmlzIChoZXVyZSBkJ8OpdMOpKTwvRk9OVD48L1NQQU4+PFNQDQoJQU4gTEFORz0iZnIiPjwvU1BBTj48U1BBTiBMQU5HPSJmciI+Jm5ic3A7PC9TUEFOPjxTUEFOIExBTkc9ImZyIj48L1NQQU4+PA0KCVNQQU4gTEFORz0iZnIiPjxCUj5uPC9TUEFOPjxTUEFOIExBTkc9ImZyIj48L1NQQU4+PFNQQU4gTEFORz0iZnIiPjwvU1BBTj4NCgk8U1BBTiBMQU5HPSJmciI+PEJSPm48Rk9OVCBTSVpFPTIgRkFDRT0iQXJpYWwiPlZvdXMgcG91dmV6IGZvdXJuaXIgw6Agdm9zDQoJIGludml0w6lzIGxlcyBsaWVucyBzdWl2YW50cyBwb3VyIGxldXIgcGVybWV0dHJlIGRlIHJlam9pbmRyZSBsYSBjb25mw6lyZW4NCgljZSBmYWNpbGVtZW50IGVuIHF1ZWxxdWVzIGNsaWNzIDogPC9GT05UPjwvU1BBTj48L1A+bm48UCBESVI9TFRSPjxTUEFOIEwNCglBTkc9ImZyIj48Rk9OVCBTSVpFPTIgRkFDRT0iU3ltYm9sIj4mIzE4Mzs8Rk9OVCBGQUNFPSJDb3VyaWVyIE5ldyI+Jm5ic3ANCgk7Jm5ic3A7Jm5ic3A7Jm5ic3A7Jm5ic3A7Jm5ic3A7PC9GT05UPjwvRk9OVD48L1NQQU4+PFNQQU4gTEFORz0iZnIiPjwNCgkvU1BBTj48U1BBTiBMQU5HPSJmciI+PC9TUEFOPjxTUEFOIExBTkc9ImZyIj4gPEZPTlQgU0laRT0yIEZBQ0U9IkFyaWFsIj5kZQ0KCXB1aXMgSU5UUkFORVQgOjwvRk9OVD48L1NQQU4+PFNQQU4gTEFORz0iZnIiPiA8L1NQQU4+PEEgSFJFRj0iaHR0cHM6Ly9tb25zDQoJaS5zc28uZnJhbmNldGVsZWNvbS5mci9pbmRleC5hc3A/dGFyZ2V0PUhUVFAlM0ElMkYlMkZjb29wbmV0LnNzby5mcmFuY2V0ZWwNCgllY29tLmZyJTJGRGVmYXVsdC5hc3B4JTNmUmV0dXJuVXJsJTNkJTI1MmZEaXJlY3RBY2Nlc3MlMjUyZlN0YXJ0Q29uZmVyZW5jZQ0KCUJ5VXJsLmFzcHglMjUzZmNwSWQlMjUzZEE1MTA5MTM4LTIwRjMtNEIxNi04NzdDLUE1ODY0MDMzNkI5NiI+PFNQQU4gTEFORz0iDQoJZnIiPjwvU1BBTj48U1BBTiBMQU5HPSJmciI+PC9TUEFOPjxTUEFOIExBTkc9ImZyIj48VT48Rk9OVCBDT0xPUj0iIzAwMDBGRiINCgkgU0laRT0yIEZBQ0U9IkFyaWFsIj5jbGlxdWV6IGljaTwvRk9OVD48L1U+PC9TUEFOPjxTUEFOIExBTkc9ImZyIj48L1NQQU4+PA0KCS9BPjxTUEFOIExBTkc9ImZyIj48L1NQQU4+PFNQQU4gTEFORz0iZnIiPjwvU1BBTj48U1BBTiBMQU5HPSJmciI+PEZPTlQgU0laDQoJRT0yIEZBQ0U9IkFyaWFsIj4gPC9GT05UPjwvU1BBTj48L1A+bm48UCBESVI9TFRSPjxTUEFOIExBTkc9ImZyIj48Rk9OVCBTDQoJSVpFPTIgRkFDRT0iU3ltYm9sIj4mIzE4Mzs8Rk9OVCBGQUNFPSJDb3VyaWVyIE5ldyI+Jm5ic3A7Jm5ic3A7Jm5ic3A7Jg0KCW5ic3A7Jm5ic3A7Jm5ic3A7PC9GT05UPjwvRk9OVD4gPEZPTlQgU0laRT0yIEZBQ0U9IkFyaWFsIj5kZXB1aXMgSU5URVJODQoJRVQgOjwvRk9OVD48L1NQQU4+PFNQQU4gTEFORz0iZnIiPiA8L1NQQU4+PEEgSFJFRj0iaHR0cHM6Ly9jb29wbmV0Lm11bHRpbWUNCglkaWEtY29uZmVyZW5jZS5vcmFuZ2UtYnVzaW5lc3MuY29tL0RpcmVjdEFjY2Vzcy9TdGFydENvbmZlcmVuY2VCeVVybC5hc3B4Pw0KCWNwSWQ9QTUxMDkxMzgtMjBGMy00QjE2LTg3N0MtQTU4NjQwMzM2Qjk2Ij48U1BBTiBMQU5HPSJmciI+PC9TUEFOPjxTUEFOIExBDQoJTkc9ImZyIj48L1NQQU4+PFNQQU4gTEFORz0iZnIiPjxVPjxGT05UIENPTE9SPSIjMDAwMEZGIiBTSVpFPTIgRkFDRT0iQXJpYWwNCgkiPmNsaXF1ZXogaWNpPC9GT05UPjwvVT48L1NQQU4+PFNQQU4gTEFORz0iZnIiPjwvU1BBTj48L0E+PFNQQU4gTEFORz0iZnIiPg0KCTwvU1BBTj48U1BBTiBMQU5HPSJmciI+PC9TUEFOPjxTUEFOIExBTkc9ImZyIj48Rk9OVCBTSVpFPTIgRkFDRT0iQXJpYWwiPiA8DQoJL0ZPTlQ+PC9TUEFOPjwvUD5ubjxQIERJUj1MVFI+PFNQQU4gTEFORz0iZnIiPjwvU1BBTj48L1A+bm48UCBESVI9TFRSPg0KCTxTUEFOIExBTkc9ImZyIj48L1NQQU4+PFNQQU4gTEFORz0iZnIiPjwvU1BBTj48U1BBTiBMQU5HPSJmci1mciI+PEZPTlQgU0laDQoJRT0yIEZBQ0U9IkNhbGlicmkiPkNvcmRpYWxlbWVudCw8L0ZPTlQ+PC9TUEFOPjxTUEFOIExBTkc9ImZyIj48L1NQQU4+PFNQQQ0KCU4gTEFORz0iZnItZnIiPiA8L1NQQU4+PC9QPm5uPFAgRElSPUxUUj48U1BBTiBMQU5HPSJmciI+PC9TUEFOPjxTUEFOIExBTg0KCUc9ImZyIj48L1NQQU4+PFNQQU4gTEFORz0iZnItZnIiPjxGT05UIFNJWkU9MiBGQUNFPSJDYWxpYnJpIj5BbGV4aXMgZXQ8L0ZPDQoJTlQ+PC9TUEFOPjxTUEFOIExBTkc9ImZyIj48L1NQQU4+PFNQQU4gTEFORz0iZnIiPjwvU1BBTj48U1BBTiBMQU5HPSJmci1mciINCgk+IDxGT05UIFNJWkU9MiBGQUNFPSJDYWxpYnJpIj5EYXZpZDwvRk9OVD48L1NQQU4+PFNQQU4gTEFORz0iZnIiPjwvU1BBTj48Uw0KCVBBTiBMQU5HPSJmci1mciI+PC9TUEFOPjwvUD5ubjxQIERJUj1MVFI+PFNQQU4gTEFORz0iZnIiPjwvU1BBTj48U1BBTiBMQQ0KCU5HPSJmciI+PC9TUEFOPjxTUEFOIExBTkc9ImZyLWZyIj48L1NQQU4+PC9QPm5uPFAgRElSPUxUUj48U1BBTiBMQU5HPSJmcg0KCS1mciI+PEZPTlQgQ09MT1I9IiMwMDgwMDAiIFNJWkU9MiBGQUNFPSJDYWxpYnJpIj5VbmUgcGVuc8OpZSDDqWNvbG8gOiZuYnNwDQoJOyBuJ2ltcHJpbWV6IHF1ZSBzaSBuw6ljZXNzYWlyZSwgc3ZwLiA8L0ZPTlQ+PC9TUEFOPjwvUD5ubjxQIERJUj1MVFI+PA0KCVNQQU4gTEFORz0iZnIiPjwvU1BBTj48L1A+bm48UCBESVI9TFRSPjxTUEFOIExBTkc9ImZyIj48L1NQQU4+PC9QPm5uPC8NCglCT0RZPm48L0hUTUw+DQpYLU1JQ1JPU09GVC1DRE8tQlVTWVNUQVRVUzpURU5UQVRJVkUNClgtTUlDUk9TT0ZULUNETy1JTVBPUlRBTkNFOjENClgtTUlDUk9TT0ZULURJU0FMTE9XLUNPVU5URVI6RkFMU0UNClgtTVMtT0xLLUFQUFRMQVNUU0VRVUVOQ0U6MA0KWC1NUy1PTEstQVVUT1NUQVJUQ0hFQ0s6RkFMU0UNClgtTVMtT0xLLUNPTkZUWVBFOjANClgtTVMtT0xLLVNFTkRFUjtDTj0iWlpaIE1PQSI6bWFpbHRvOnNlbGZjYXJlLmxvQG9yYW5nZS5jb20NCkVORDpWRVZFTlQNCkJFR0lOOlZFVkVOVA0KQVRURU5ERUU7Q049IkZFTkFZUk9VIEFubmUgRXh0IE9GL0RTSUYiO1JTVlA9VFJVRTptYWlsdG86YWZlbmF5cm91LmV4dEBvcmFuDQoJZ2UuY29tDQpBVFRFTkRFRTtDTj0iTEFWQUJSRSBDbMOpbWVudCBPRi9EU0lGIjtSU1ZQPVRSVUU6bWFpbHRvOmNsZW1lbnQubGF2YWJyZUBvcmENCgluZ2UuY29tDQpBVFRFTkRFRTtDTj1jaHJpc3RvcGhlLmNvbWJldEBncmVlbi1jb25zZWlsLmNvbTtSU1ZQPVRSVUU6bWFpbHRvOmNocmlzdG9waGUNCgkuY29tYmV0QGdyZWVuLWNvbnNlaWwuY29tDQpBVFRFTkRFRTtDTj1vbGl2aWVyLnZhbnNvbkBncmVlbi1jb25zZWlsLmNvbTtSU1ZQPVRSVUU6bWFpbHRvOm9saXZpZXIudmFuc28NCgluQGdyZWVuLWNvbnNlaWwuY29tDQpBVFRFTkRFRTtDTj1nZW9yZ2VzLnJvY2NvQGdyZWVuLWNvbnNlaWwuY29tO1JTVlA9VFJVRTptYWlsdG86Z2Vvcmdlcy5yb2Njb0ANCglncmVlbi1jb25zZWlsLmNvbQ0KQ0xBU1M6UFVCTElDDQpDUkVBVEVEOjIwMTQwNDE3VDE0MDA0NFoNCkRFU0NSSVBUSU9OOlF1YW5kIDogbHVuZGkgMjggYXZyaWwgMjAxNCAxMDowMC0xMTowMCAoVVRDKzAxOjAwKSBCcnV4ZWxsZXMsDQoJIENvcGVuaGFndWUsIE1hZHJpZCwgUGFyaXMubkVtcGxhY2VtZW50IDogw6AgZMOpZmluaXJublJlbWFycXVlIDogbGUgDQoJZMOpY2FsYWdlIEdNVCBjaS1kZXNzdXMgbmUgdGllbnQgcGFzIGNvbXB0ZSBkZXMgcsOpZ2xhZ2VzIGRlIGwnaGV1cmUgZCfDqXQNCgnDqS5ubip+Kn4qfip+Kn4qfip+Kn4qfipubkJvbmpvdXIsbm5NZXJjaSDDoCB0b3VzIGRlIHZvdXMgcmVuZHJlIGRpDQoJc3BvbmlibGUgc3VyIGNlIGNyw6luZWF1IHBvdXIgcXVlIG5vdXMgcHVpc3Npb25zIGVuc2VtYmxlIHZhbGlkZXIgbGVzIMOpbA0KCcOpbWVudHMgZHUgYnJpZWYgcG91ciBsZSBUQSBkdSAyMi8wNS5ubkNkbHQsbm5MdXhpc2xlIFNpZXdlIFRvbGFuQ2hlDQoJZiBkZSBQcm9qZXQgV2Vibk9yYW5nZSA8aHR0cDovL29uZS1kaXJlY3Rvcnkuc3NvLmZyYW5jZXRlbGVjb20uZnIvYW5udWFpcg0KCWUvZW50aXRlLmRvP2FjdGlvbj1WaWV3JnVpZD0lMjMlMDAlN0UlMEYlMDREJTBBJTA3cSUxMC0lMUQlMTklMUMlMEMlMTclM0ZZDQoJJTI3JTBBTSUwMSUwQiUwNiUzRSUxNC0lMDclMDUlMDklMEMlMDAlMjlZJTI3JTBBTSUwRSUxNyUxMyUyMiUxNiUyNiUxRCUxNSUNCgkwNCUwMCUxMSUyMyUxOG8lMEQlMTNVJTAzJTAwPiAvIE9GIDxodHRwOi8vb25lLWRpcmVjdG9yeS5zc28uZnJhbmNldGVsZWNvbQ0KCS5mci9hbm51YWlyZS9lbnRpdGUuZG8/YWN0aW9uPVZpZXcmdWlkPSUyMyUwMCU3RSUwNiUxNkQlMEElMDdxJTEzN0UlMUYlMURYDQoJJTE3JTIyJTAxKiUxRCUxOSUwRCUxNiU1RSUyOCUxNiU3RSUwMCUxRSUxQyUxNyUxMyUyMiUxQjYlMDglMTklMUElMDAlNUUlMjgNCgklMTYlN0UlMEYlMDIlMDklMEIlMTElMjklMDElMjYlMDUlMTUlMEIlMEElMUYlNjAlMTErVCUxNiUxQT4gLyBEUkNHUCA8aHR0cA0KCTovL29uZS1kaXJlY3Rvcnkuc3NvLmZyYW5jZXRlbGVjb20uZnIvYW5udWFpcmUvZW50aXRlLmRvP2FjdGlvbj1WaWV3JnVpZD0lDQoJMjMlMDAlN0UlMEQlMDIlMEIlMDIlMDIlNjAlMUE2VCUxRiUwRUklMUQ5SCUyNSUxRCU1QyUwNyUxME8lMjklMUI3JTAwJTA0JTANCgkxJTAwJTAxJTYwJTExK1QlMTklMDYlMTElMDAtJTFCLSUxQyUxMSUwMSUxNyUxNyU2MCUxMStUJTE2JTFBJTA0JTFDJTJGJTEwNw0KCSUwQyUxQyUwRCUwNiUxRCUyMVklMjclMEFNJTBFJTE3PiAvIERDT0wgPGh0dHA6Ly9vbmUtZGlyZWN0b3J5LnNzby5mcmFuY2V0DQoJZWxlY29tLmZyL2FubnVhaXJlL2VudGl0ZS5kbz9hY3Rpb249VmlldyZ1aWQ9JTIzJTAwJTdFJTBEJTEzJTA3JTA5JTVFJTIzJTANCgkwJTdFJTBEJTAyJTBCJTAyJTAyJTYwJTFBNlQlMUYlMEVJJTFEOUglMjUlMUQlNUMlMDclMTBPJTI5JTFCNyUwMCUwNCUwMSUwMA0KCSUwMSU2MCUxMStUJTE5JTA2JTExJTAwLSUxQi0lMUMlMTElMDElMTclMTclNjAlMTErVCUxNiUxQSUwNCUxQyUyRiUxMDclMEMlDQoJMUMlMEQlMDYlMUQlMjFZJTI3JTBBTSUwRSUxNz4gLyBTRUxGQ0FSRSA8aHR0cDovL29uZS1kaXJlY3Rvcnkuc3NvLmZyYW5jZXQNCgllbGVjb20uZnIvYW5udWFpcmUvZW50aXRlLmRvP2FjdGlvbj1WaWV3JnVpZD0lMjMlMDAlN0UlMUElMTUlMDQlMDMlMTEtJTA3JQ0KCTI2RSUxRiUxRFglMTYlMkYlMUElMkZFJTFGJTFEWCUxNiUzRSUxNiUyNCUxOSU1QyUwNyUxME8lMjMlMTNvJTA2JTA1VSUwMyUwDQoJNiU2MCUxQTZUJTE1JTA2JTExJTFCOCUxQyUyNiUxQSU1QyUwQyUwNk8lMjUlMUI3JTFCJTExJTA2JTBCJTA3LSUxQzElMEMlNUMNCgklMEMlMDZPKiUwNyUyMiUwNyUxMyUwRCUxMSUxNyslMTArJTA2JTFERCUwMSUxMXElMTMxPiAgbjAxIDU3IDM2IDAxIDcwbjANCgk3IDg5IDUxIDgxIDYxbmx1eGlzbGUuc2lld2V0b2xhQG9yYW5nZS5jb21ubm5ubm4NCkRURU5EO1RaSUQ9IlJvbWFuY2UgU3RhbmRhcmQgVGltZSI6MjAxNDA0MjhUMTEwMDAwDQpEVFNUQU1QOjIwMTQwNDE3VDE0MDA0MFoNCkRUU1RBUlQ7VFpJRD0iUm9tYW5jZSBTdGFuZGFyZCBUaW1lIjoyMDE0MDQyOFQxMDAwMDANCkxBU1QtTU9ESUZJRUQ6MjAxNDA0MTdUMTQwMDQ0Wg0KTE9DQVRJT046w6AgZMOpZmluaXINCk9SR0FOSVpFUjtDTj0iU0lFV0UgVE9MQSBMdXhpc2xlIE9GL0RSQ0dQIjptYWlsdG86bHV4aXNsZS5zaWV3ZXRvbGFAb3JhbmdlLg0KCWNvbQ0KUFJJT1JJVFk6NQ0KU0VRVUVOQ0U6MA0KU1VNTUFSWTtMQU5HVUFHRT1mcjpWYWxpZGF0aW9uIGR1IGJyaWVmIFRBIGR1IDIyIG1haQ0KVFJBTlNQOk9QQVFVRQ0KVUlEOjA0MDAwMDAwODIwMEUwMDA3NEM1QjcxMDFBODJFMDA4MDAwMDAwMDAzMDM0REQwQTU2NUFDRjAxMDAwMDAwMDAwMDAwMDAwDQoJMDEwMDAwMDAwREQ5NjUwRDlFRDAwQTI0N0I3QTVDMUQ4NDY2REQxNEYNClgtQUxULURFU0M7Rk1UVFlQRT10ZXh0L2h0bWw6PCFET0NUWVBFIEhUTUwgUFVCTElDICItLy9XM0MvL0RURCBIVE1MIDMuMi8vRQ0KCU4iPm48SFRNTD5uPEhFQUQ+bjxNRVRBIE5BTUU9IkdlbmVyYXRvciIgQ09OVEVOVD0iTVMgRXhjaGFuZ2UgU2VydmVyIHZlDQoJcnNpb24gMTQuMDIuNTAwNC4wMDAiPm48VElUTEU+PC9USVRMRT5uPC9IRUFEPm48Qk9EWT5uPCEtLSBDb252ZXJ0ZWQgZg0KCXJvbSB0ZXh0L3J0ZiBmb3JtYXQgLS0+bm48UCBESVI9TFRSPjxTUEFOIExBTkc9ImZyIj48Rk9OVCBGQUNFPSJDYWxpYnJpIg0KCT5RdWFuZCA6IGx1bmRpIDI4IGF2cmlsIDIwMTQgMTA6MDAtMTE6MDAgKFVUQyswMTowMCkgQnJ1eGVsbGVzLCBDb3BlbmhhZ3UNCgllLCBNYWRyaWQsIFBhcmlzLjwvRk9OVD48L1NQQU4+PC9QPm5uPFAgRElSPUxUUj48U1BBTiBMQU5HPSJmciI+PEZPTlQgDQoJRkFDRT0iQ2FsaWJyaSI+RW1wbGFjZW1lbnQgOiDDoCBkw6lmaW5pcjwvRk9OVD48L1NQQU4+PC9QPm5uPFAgRElSPUxUUj48DQoJU1BBTiBMQU5HPSJmciI+PEZPTlQgRkFDRT0iQ2FsaWJyaSI+UmVtYXJxdWUgOiBsZSBkw6ljYWxhZ2UgR01UIGNpLWRlc3N1cyANCgluZSB0aWVudCBwYXMgY29tcHRlIGRlcyByw6lnbGFnZXMgZGUgbCdoZXVyZSBkJ8OpdMOpLjwvRk9OVD48L1NQQU4+PC9QPm4NCgluPFAgRElSPUxUUj48U1BBTiBMQU5HPSJmciI+PEZPTlQgRkFDRT0iQ2FsaWJyaSI+Kn4qfip+Kn4qfip+Kn4qfip+KjwvRk9OVA0KCT48L1NQQU4+PC9QPm5uPFAgRElSPUxUUj48U1BBTiBMQU5HPSJmciI+PEZPTlQgRkFDRT0iQ2FsaWJyaSI+Qm9uam91ciw8DQoJL0ZPTlQ+PC9TUEFOPjwvUD5ubjxQIERJUj1MVFI+PFNQQU4gTEFORz0iZnIiPjxGT05UIEZBQ0U9IkNhbGlicmkiPk1lcmNpDQoJIMOgIHRvdXMgZGUgdm91cyByZW5kcmUgZGlzcG9uaWJsZSBzdXIgY2UgY3LDqW5lYXUgcG91ciBxdWUgbm91cyBwdWlzc2lvbnMNCgkgZW5zZW1ibGUgdmFsaWRlciBsZXMgw6lsw6ltZW50cyBkdSBicmllZiBwb3VyIGxlIFRBIGR1IDIyLzA1LjwvRk9OVD48L1NQQQ0KCU4+PFNQQU4gTEFORz0iZnIiPjwvU1BBTj48L1A+bm48UCBESVI9TFRSPjxTUEFOIExBTkc9ImZyIj48Qj48L0I+PC9TUEFOPg0KCTxCPjxTUEFOIExBTkc9ImZyLWZyIj48L1NQQU4+PC9CPjwvUD5ubjxQIERJUj1MVFI+PEI+PFNQQU4gTEFORz0iZnItZnIiPg0KCTxGT05UIENPTE9SPSIjMjYyNjI2IiBGQUNFPSJDYWxpYnJpIj5DZGx0LDwvRk9OVD48L1NQQU4+PC9CPjwvUD5ubjxQIERJDQoJUj1MVFI+PEI+PFNQQU4gTEFORz0iZnItZnIiPjxGT05UIENPTE9SPSIjMjYyNjI2IiBGQUNFPSJDYWxpYnJpIj5MdXhpc2xlIFMNCglpZXdlIFRvbGE8L0ZPTlQ+PC9TUEFOPjwvQj48L1A+bm48UCBESVI9TFRSPjxTUEFOIExBTkc9ImZyIj48L1NQQU4+PFNQQU4NCgkgTEFORz0iZnItZnIiPjxGT05UIENPTE9SPSIjMjYyNjI2IiBGQUNFPSJDYWxpYnJpIj5DaGVmIGRlIFByb2pldCBXZWI8L0ZPTg0KCVQ+PC9TUEFOPjwvUD5ubjxQIERJUj1MVFI+PFNQQU4gTEFORz0iZnIiPjwvU1BBTj48QSBIUkVGPSJodHRwOi8vb25lLWRpcg0KCWVjdG9yeS5zc28uZnJhbmNldGVsZWNvbS5mci9hbm51YWlyZS9lbnRpdGUuZG8/YWN0aW9uPVZpZXcmYW1wO3VpZD0lMjMlMDANCgklN0UlMEYlMDREJTBBJTA3cSUxMC0lMUQlMTklMUMlMEMlMTclM0ZZJTI3JTBBTSUwMSUwQiUwNiUzRSUxNC0lMDclMDUlMDklMA0KCUMlMDAlMjlZJTI3JTBBTSUwRSUxNyUxMyUyMiUxNiUyNiUxRCUxNSUwNCUwMCUxMSUyMyUxOG8lMEQlMTNVJTAzJTAwIj48U1BBDQoJTiBMQU5HPSJmciI+PC9TUEFOPjxTUEFOIExBTkc9ImZyIj48L1NQQU4+PFNQQU4gTEFORz0iZnItZnIiPjxGT05UIENPTE9SPSINCgkjMjYyNjI2IiBTSVpFPTIgRkFDRT0iQ2FsaWJyaSI+T3JhbmdlPC9GT05UPjwvU1BBTj48U1BBTiBMQU5HPSJmciI+PC9TUEFOPg0KCTwvQT48U1BBTiBMQU5HPSJmciI+PC9TUEFOPjxTUEFOIExBTkc9ImZyIj48L1NQQU4+PFNQQU4gTEFORz0iZnItZnIiPjxGT05UDQoJIENPTE9SPSIjMjYyNjI2IiBTSVpFPTIgRkFDRT0iQ2FsaWJyaSI+LzwvRk9OVD48L1NQQU4+PFNQQU4gTEFORz0iZnIiPiA8L1MNCglQQU4+PEEgSFJFRj0iaHR0cDovL29uZS1kaXJlY3Rvcnkuc3NvLmZyYW5jZXRlbGVjb20uZnIvYW5udWFpcmUvZW50aXRlLmRvPw0KCWFjdGlvbj1WaWV3JmFtcDt1aWQ9JTIzJTAwJTdFJTA2JTE2RCUwQSUwN3ElMTM3RSUxRiUxRFglMTclMjIlMDEqJTFEJTE5JTANCglEJTE2JTVFJTI4JTE2JTdFJTAwJTFFJTFDJTE3JTEzJTIyJTFCNiUwOCUxOSUxQSUwMCU1RSUyOCUxNiU3RSUwRiUwMiUwOSUwQg0KCSUxMSUyOSUwMSUyNiUwNSUxNSUwQiUwQSUxRiU2MCUxMStUJTE2JTFBIj48U1BBTiBMQU5HPSJmciI+PC9TUEFOPjxTUEFOIExBDQoJTkc9ImZyIj48L1NQQU4+PFNQQU4gTEFORz0iZnItZnIiPjxGT05UIENPTE9SPSIjMjYyNjI2IiBTSVpFPTIgRkFDRT0iQ2FsaWINCglyaSI+T0Y8L0ZPTlQ+PC9TUEFOPjxTUEFOIExBTkc9ImZyIj48L1NQQU4+PC9BPjxTUEFOIExBTkc9ImZyIj48L1NQQU4+PFNQQQ0KCU4gTEFORz0iZnIiPjwvU1BBTj48U1BBTiBMQU5HPSJmci1mciI+PEZPTlQgQ09MT1I9IiMyNjI2MjYiIFNJWkU9MiBGQUNFPSJDDQoJYWxpYnJpIj4vPC9GT05UPjwvU1BBTj48U1BBTiBMQU5HPSJmciI+IDwvU1BBTj48QSBIUkVGPSJodHRwOi8vb25lLWRpcmVjdG8NCglyeS5zc28uZnJhbmNldGVsZWNvbS5mci9hbm51YWlyZS9lbnRpdGUuZG8/YWN0aW9uPVZpZXcmYW1wO3VpZD0lMjMlMDAlN0UlDQoJMEQlMDIlMEIlMDIlMDIlNjAlMUE2VCUxRiUwRUklMUQ5SCUyNSUxRCU1QyUwNyUxME8lMjklMUI3JTAwJTA0JTAxJTAwJTAxJTYNCgkwJTExK1QlMTklMDYlMTElMDAtJTFCLSUxQyUxMSUwMSUxNyUxNyU2MCUxMStUJTE2JTFBJTA0JTFDJTJGJTEwNyUwQyUxQyUwRA0KCSUwNiUxRCUyMVklMjclMEFNJTBFJTE3Ij48U1BBTiBMQU5HPSJmciI+PC9TUEFOPjxTUEFOIExBTkc9ImZyIj48L1NQQU4+PFNQDQoJQU4gTEFORz0iZnItZnIiPjxGT05UIENPTE9SPSIjMjYyNjI2IiBTSVpFPTIgRkFDRT0iQ2FsaWJyaSI+RFJDR1A8L0ZPTlQ+PC8NCglTUEFOPjxTUEFOIExBTkc9ImZyIj48L1NQQU4+PC9BPjxTUEFOIExBTkc9ImZyIj48L1NQQU4+PFNQQU4gTEFORz0iZnIiPjwvUw0KCVBBTj48U1BBTiBMQU5HPSJmci1mciI+PEZPTlQgQ09MT1I9IiMyNjI2MjYiIFNJWkU9MiBGQUNFPSJDYWxpYnJpIj4vPC9GT05UDQoJPjwvU1BBTj48U1BBTiBMQU5HPSJmciI+IDwvU1BBTj48QSBIUkVGPSJodHRwOi8vb25lLWRpcmVjdG9yeS5zc28uZnJhbmNldGUNCglsZWNvbS5mci9hbm51YWlyZS9lbnRpdGUuZG8/YWN0aW9uPVZpZXcmYW1wO3VpZD0lMjMlMDAlN0UlMEQlMTMlMDclMDklNUUlDQoJMjMlMDAlN0UlMEQlMDIlMEIlMDIlMDIlNjAlMUE2VCUxRiUwRUklMUQ5SCUyNSUxRCU1QyUwNyUxME8lMjklMUI3JTAwJTA0JTANCgkxJTAwJTAxJTYwJTExK1QlMTklMDYlMTElMDAtJTFCLSUxQyUxMSUwMSUxNyUxNyU2MCUxMStUJTE2JTFBJTA0JTFDJTJGJTEwNw0KCSUwQyUxQyUwRCUwNiUxRCUyMVklMjclMEFNJTBFJTE3Ij48U1BBTiBMQU5HPSJmciI+PC9TUEFOPjxTUEFOIExBTkc9ImZyIj48DQoJL1NQQU4+PFNQQU4gTEFORz0iZnItZnIiPjxGT05UIENPTE9SPSIjMjYyNjI2IiBTSVpFPTIgRkFDRT0iQ2FsaWJyaSI+RENPTDwNCgkvRk9OVD48L1NQQU4+PFNQQU4gTEFORz0iZnIiPjwvU1BBTj48L0E+PFNQQU4gTEFORz0iZnIiPjwvU1BBTj48U1BBTiBMQU5HPQ0KCSJmciI+PC9TUEFOPjxTUEFOIExBTkc9ImZyLWZyIj48Rk9OVCBDT0xPUj0iIzI2MjYyNiIgU0laRT0yIEZBQ0U9IkNhbGlicmkiDQoJPi88L0ZPTlQ+PC9TUEFOPjxTUEFOIExBTkc9ImZyIj4gPC9TUEFOPjxBIEhSRUY9Imh0dHA6Ly9vbmUtZGlyZWN0b3J5LnNzby4NCglmcmFuY2V0ZWxlY29tLmZyL2FubnVhaXJlL2VudGl0ZS5kbz9hY3Rpb249VmlldyZhbXA7dWlkPSUyMyUwMCU3RSUxQSUxNSUwDQoJNCUwMyUxMS0lMDclMjZFJTFGJTFEWCUxNiUyRiUxQSUyRkUlMUYlMURYJTE2JTNFJTE2JTI0JTE5JTVDJTA3JTEwTyUyMyUxM28NCgklMDYlMDVVJTAzJTA2JTYwJTFBNlQlMTUlMDYlMTElMUI4JTFDJTI2JTFBJTVDJTBDJTA2TyUyNSUxQjclMUIlMTElMDYlMEIlMA0KCTctJTFDMSUwQyU1QyUwQyUwNk8qJTA3JTIyJTA3JTEzJTBEJTExJTE3KyUxMCslMDYlMUREJTAxJTExcSUxMzEiPjxTUEFOIExBDQoJTkc9ImZyIj48L1NQQU4+PFNQQU4gTEFORz0iZnIiPjwvU1BBTj48U1BBTiBMQU5HPSJmci1mciI+PEZPTlQgQ09MT1I9IiMyNjINCgk2MjYiIFNJWkU9MiBGQUNFPSJDYWxpYnJpIj5TRUxGQ0FSRTwvRk9OVD48L1NQQU4+PFNQQU4gTEFORz0iZnIiPjwvU1BBTj48Lw0KCUE+PFNQQU4gTEFORz0iZnIiPjwvU1BBTj48U1BBTiBMQU5HPSJmciI+PC9TUEFOPjxTUEFOIExBTkc9ImZyLWZyIj48Rk9OVCBDDQoJT0xPUj0iIzI2MjYyNiIgU0laRT0yIEZBQ0U9IkNhbGlicmkiPiA8L0ZPTlQ+PC9TUEFOPjwvUD5ubjxQIERJUj1MVFI+PFNQDQoJQU4gTEFORz0iZnItZnIiPjxGT05UIENPTE9SPSIjMjYyNjI2IiBTSVpFPTIgRkFDRT0iQ2FsaWJyaSI+MDEgNTcgMzYgMDEgNzANCgk8L0ZPTlQ+PC9TUEFOPjwvUD5ubjxQIERJUj1MVFI+PFNQQU4gTEFORz0iZnIiPjwvU1BBTj48U1BBTiBMQU5HPSJmciI+PC8NCglTUEFOPjxTUEFOIExBTkc9ImZyLWZyIj48Rk9OVCBDT0xPUj0iIzI2MjYyNiIgU0laRT0yIEZBQ0U9IkNhbGlicmkiPjA3IDg5IA0KCTUxIDgxIDYxPC9GT05UPjwvU1BBTj48L1A+bm48UCBESVI9TFRSPjxTUEFOIExBTkc9ImZyIj48L1NQQU4+PEEgSFJFRj0iZg0KCWlsZTovL2x1eGlzbGUuc2lld2V0b2xhQG9yYW5nZS5jb20iPjxTUEFOIExBTkc9ImZyIj48L1NQQU4+PFNQQU4gTEFORz0iZnItDQoJZnIiPjxGT05UIENPTE9SPSIjRjc5NjQ2IiBGQUNFPSJDYWxpYnJpIj5sdXhpc2xlLnNpZXdldG9sYUBvcmFuZ2UuY29tPC9GT04NCglUPjwvU1BBTj48U1BBTiBMQU5HPSJmciI+PC9TUEFOPjwvQT48U1BBTiBMQU5HPSJmciI+PC9TUEFOPjxTUEFOIExBTkc9ImZyLQ0KCWZyIj48L1NQQU4+PC9QPm5uPFAgRElSPUxUUj48U1BBTiBMQU5HPSJmciI+PC9TUEFOPjxTUEFOIExBTkc9ImZyIj48L1NQQQ0KCU4+PFNQQU4gTEFORz0iZnIiPjwvU1BBTj48U1BBTiBMQU5HPSJmci1mciI+PEJSPm48L1NQQU4+PC9QPm5uPFAgRElSPUxUDQoJUj48U1BBTiBMQU5HPSJmciI+PC9TUEFOPjxTUEFOIExBTkc9ImZyLWZyIj48L1NQQU4+PC9QPm5uPFAgRElSPUxUUj48U1BBDQoJTiBMQU5HPSJmciI+PC9TUEFOPjwvUD5ubjxQIERJUj1MVFI+PFNQQU4gTEFORz0iZnIiPjwvU1BBTj48L1A+bm48L0JPRA0KCVk+bjwvSFRNTD4NClgtTUlDUk9TT0ZULUNETy1CVVNZU1RBVFVTOlRFTlRBVElWRQ0KWC1NSUNST1NPRlQtQ0RPLUlNUE9SVEFOQ0U6MQ0KWC1NSUNST1NPRlQtRElTQUxMT1ctQ09VTlRFUjpGQUxTRQ0KWC1NUy1PTEstQVBQVExBU1RTRVFVRU5DRTowDQpYLU1TLU9MSy1DT05GVFlQRTowDQpCRUdJTjpWQUxBUk0NClRSSUdHRVI6LVBUMTVNDQpBQ1RJT046RElTUExBWQ0KREVTQ1JJUFRJT046UmVtaW5kZXINCkVORDpWQUxBUk0NCkVORDpWRVZFTlQNCkJFR0lOOlZFVkVOVA0KQVRURU5ERUU7Q049IkFHTkVTIFBhdHJpY2sgT0YvRFNJRiI7UlNWUD1UUlVFOm1haWx0bzpwYXRyaWNrLmFnbmVzQG9yYW5nZS5jDQoJb20NCkFUVEVOREVFO0NOPSJQT0lST1QgSmVhbiBEYXZpZCBPRi9EU0lGIjtSU1ZQPVRSVUU6bWFpbHRvOmplYW5kYXZpZC5wb2lyb3RAbw0KCXJhbmdlLmNvbQ0KQVRURU5ERUU7Q049IkJFVVpPTiBTb2xlbmUgT0YvRFNJRiI7UlNWUD1UUlVFOm1haWx0bzpzb2xlbmUuYmV1em9uQG9yYW5nZS5jDQoJb20NCkFUVEVOREVFO0NOPSJDSEVTVEVSUyBEYW5pZWwgRXh0IE9GL0RTSUYiO1JTVlA9VFJVRTptYWlsdG86ZGNoZXN0ZXJzLmV4dEBvcg0KCWFuZ2UuY29tDQpBVFRFTkRFRTtDTj0iU09XIEJldHR5IEV4dCBPRi9EU0lGIjtSU1ZQPVRSVUU6bWFpbHRvOmJlc293LmV4dEBvcmFuZ2UuY29tDQpBVFRFTkRFRTtDTj0iU0FMSEkgQ2hhZmlhYSBFeHQgT0YvRFNJRiI7UlNWUD1UUlVFOm1haWx0bzpjc2FsaGkuZXh0QG9yYW5nZS4NCgljb20NCkFUVEVOREVFO0NOPSJCT1VLSExJRkEgS2FyaW0gT0YvRFNJRiI7UlNWUD1UUlVFOm1haWx0bzprYXJpbS5ib3VraGxpZmFAb3Jhbg0KCWdlLmNvbQ0KQVRURU5ERUU7Q049Ik9VTEQgQUhNRURPVSBNb2hhbWVkIExlbWluZSBPRi9EU0lGIjtSU1ZQPVRSVUU6bWFpbHRvOmxlbWluZS5hDQoJaG1lZG91QG9yYW5nZS5jb20NCkFUVEVOREVFO0NOPSJORElBWUUgWWFraGFtIE9GL0RTSUYiO1JTVlA9VFJVRTptYWlsdG86eWFraGFtLm5kaWF5ZUBvcmFuZ2UuYw0KCW9tDQpBVFRFTkRFRTtDTj0iUkVDSEVSIE5pY29sYXMgT0YvRFNJRiI7UlNWUD1UUlVFOm1haWx0bzpuaWNvbGFzLnJlY2hlckBvcmFuZ2UNCgkuY29tDQpBVFRFTkRFRTtDTj0iQ0FUUk9VIE1hdGhpYXMgT0YvRFNJRiI7UlNWUD1UUlVFOm1haWx0bzptYXRoaWFzLmNhdHJvdUBvcmFuZ2UNCgkuY29tDQpBVFRFTkRFRTtDTj0iWkhPVSBKaW5nIEppbmcgT0YvRFNJRiI7UlNWUD1UUlVFOm1haWx0bzpqaW5namluZy56aG91QG9yYW5nZS4NCgljb20NCkFUVEVOREVFO0NOPSJDQVNTT1UgQ2hyaXN0b3BoZSBFeHQgT0YvRFNJRiI7UlNWUD1UUlVFOm1haWx0bzpjY2Fzc291LmV4dEBvcg0KCWFuZ2UuY29tDQpBVFRFTkRFRTtDTj0iQlJJTExBTlQgSmVyb21lIEV4dCBPRi9EU0lGIjtSU1ZQPVRSVUU6bWFpbHRvOmplYnJpbGxhbnQuZXh0QG8NCglyYW5nZS5jb20NCkFUVEVOREVFO0NOPSJCQVlBUlQgT2xpdmllciBPRi9EU0lGIjtSU1ZQPVRSVUU6bWFpbHRvOm9saXZpZXIuYmF5YXJ0QG9yYW5nZQ0KCS5jb20NCkFUVEVOREVFO0NOPSJGQURMQU9VSSBJZHJpc3MgRXh0IE9GL0RTSUYiO1JTVlA9VFJVRTptYWlsdG86aWZhZGxhb3VpLmV4dEBvcg0KCWFuZ2UuY29tDQpBVFRFTkRFRTtDTj0iRkVMSUhPIFdpbGZyaWQgT0YvRFNJRiI7UlNWUD1UUlVFOm1haWx0bzp3aWxmcmlkLmZlbGlob0BvcmFuZ2UNCgkuY29tDQpBVFRFTkRFRTtDTj0iQUxHRVIgR3LDqWdvcnkgT0YvRFNJRiI7UlNWUD1UUlVFOm1haWx0bzpncmVnb3J5LmFsZ2VyQG9yYW5nZS4NCgljb20NCkFUVEVOREVFO0NOPSJCUkFORFQgQWxleGlzIE9GL0RTSUYiO1JTVlA9VFJVRTptYWlsdG86YWxleGlzLmJyYW5kdEBvcmFuZ2UuYw0KCW9tDQpBVFRFTkRFRTtDTj0iTUVORFJBUyBGcmFuY2sgT0YvRFNJRiI7UlNWUD1UUlVFOm1haWx0bzpmcmFuY2subWVuZHJhc0BvcmFuZ2UNCgkuY29tDQpBVFRFTkRFRTtDTj0iQ0hFSEFJQk9VIEF6ZWRkaW5lIE9GL0RTSUYiO1JTVlA9VFJVRTptYWlsdG86YXplZGRpbmUuY2hlaGFpYm8NCgl1QG9yYW5nZS5jb20NCkFUVEVOREVFO0NOPSJaQUhSQU1BTkUgSGFzc2FuIE9GL0RTSUYiO1JTVlA9VFJVRTptYWlsdG86aGFzc2FuLnphaHJhbWFuZUBvcg0KCWFuZ2UuY29tDQpBVFRFTkRFRTtDTj0iVE9ET1JPVkEgQW5hIE9GL0RTSUYiO1JTVlA9VFJVRTptYWlsdG86YW5hLnRvZG9yb3ZhQG9yYW5nZS5jb20NCkFUVEVOREVFO0NOPSJQRVRJVCBKdWxpZXR0ZSBFeHQgT0YvRFNJRiI7UlNWUD1UUlVFOm1haWx0bzpqcGV0aXQuZXh0QG9yYW5nZQ0KCS5jb20NCkFUVEVOREVFO0NOPSJCUkVURUFVWCBMaW9uZWwgT0YvRFNJRiI7UlNWUD1UUlVFOm1haWx0bzpsaW9uZWwxLmJyZXRlYXV4QG9yYQ0KCW5nZS5jb20NCkFUVEVOREVFO0NOPSJCT1VDSEFSRCBDaHJpc3RvcGhlIE9GL0RTSUYiO1JTVlA9VFJVRTptYWlsdG86Y2hyaXN0b3BoZTEuYm91Yw0KCWhhcmRAb3JhbmdlLmNvbQ0KQVRURU5ERUU7Q049IkNIQUxMSUdVSSBTaWRpIElkcmlzcyBFeHQgT0YvRFNJRiI7UlNWUD1UUlVFOm1haWx0bzpzY2hhbGxpZ3VpDQoJLmV4dEBvcmFuZ2UuY29tDQpBVFRFTkRFRTtDTj0iR09VU1NFQVUgTWF4aW1lIEV4dCBPRi9EU0lGIjtSU1ZQPVRSVUU6bWFpbHRvOm1nb3Vzc2VhdS5leHRAb3INCglhbmdlLmNvbQ0KQVRURU5ERUU7Q049IkFST05ERUwgRXJpY2sgRXh0IE9GL0RTSUYiO1JTVlA9VFJVRTptYWlsdG86ZWFyb25kZWwuZXh0QG9yYW5nDQoJZS5jb20NCkFUVEVOREVFO0NOPWVuZ3VlcnJhbi5sb3VybWVAZ2ZpLmZyO1JTVlA9VFJVRTptYWlsdG86ZW5ndWVycmFuLmxvdXJtZUBnZmkuZg0KCXINCkFUVEVOREVFO0NOPSJCRU5LQURET1VSIEthZGRvdXIgRXh0IE9GL0RTSUYiO1JTVlA9VFJVRTptYWlsdG86a2JlbmthZGRvdXIuZQ0KCXh0QG9yYW5nZS5jb20NCkFUVEVOREVFO0NOPSJST0JJTiBTdMOpcGhhbmUgRXh0IE9GL0RTSUYiO1JTVlA9VFJVRTptYWlsdG86c3JvYmluLmV4dEBvcmFuZw0KCWUuY29tDQpBVFRFTkRFRTtDTj0iTU9VS1JJTSBBZGlsIEV4dCBPRi9EU0lGIjtSU1ZQPVRSVUU6bWFpbHRvOmFtb3VrcmltLmV4dEBvcmFuZ2UNCgkuY29tDQpBVFRFTkRFRTtDTj0iS0hBTElLQU5FIE5hamxhYSBPRi9EU0lGIjtSU1ZQPVRSVUU6bWFpbHRvOm5hamxhYS5raGFsaWthbmVAb3INCglhbmdlLmNvbQ0KQVRURU5ERUU7Q049IkNIRVZBTElFUiBTeWx2YWluIE9GL0RTSUYiO1JTVlA9VFJVRTptYWlsdG86c3lsdmFpbi5jaGV2YWxpZXJADQoJb3JhbmdlLmNvbQ0KQVRURU5ERUU7Q049IlpBWUFORSBTb3VmaWFuZSBFeHQgT0YvRFNJRiI7UlNWUD1UUlVFOm1haWx0bzpzemF5YW5lLmV4dEBvcmFuDQoJZ2UuY29tDQpBVFRFTkRFRTtDTj0iQ0hBTVNFRERJTkUgU2FsaW0gRXh0IE9GL0RTSUYiO1JTVlA9VFJVRTptYWlsdG86c2NoYW1zZWRkaW5lLmUNCgl4dEBvcmFuZ2UuY29tDQpBVFRFTkRFRTtDTj0iTE9VUE1PTiBHaGlzbGFpbiBPRi9EU0lGIjtSU1ZQPVRSVUU6bWFpbHRvOmdoaXNsYWluLmxvdXBtb25Ab3INCglhbmdlLmNvbQ0KQVRURU5ERUU7Q049IlNBVklWQU5IIEVyaWMgRXh0IE9GL0RTSUYiO1JTVlA9VFJVRTptYWlsdG86ZXNhdml2YW5oLmV4dEBvcmFuDQoJZ2UuY29tDQpBVFRFTkRFRTtDTj0iR0VSVU0gVmFsZW50aW4gRXh0IE9GL0RTSUYiO1JTVlA9VFJVRTptYWlsdG86dmdlcnVtLmV4dEBvcmFuZ2UNCgkuY29tDQpBVFRFTkRFRTtDTj0iJ09saXZpZXIgVkFOU09OJyI7UlNWUD1UUlVFOm1haWx0bzpvbGl2aWVyLnZhbnNvbkBncmVlbi1jb25zZWkNCglsLmNvbQ0KQVRURU5ERUU7Q049IlpPUkRBTiBQaGlsaXBwZSBPRi9EU0lGIjtSU1ZQPVRSVUU6bWFpbHRvOnBoaWxpcHBlLnpvcmRhbkBvcmFuDQoJZ2UuY29tDQpBVFRFTkRFRTtDTj0iRkVOQVlST1UgQW5uZSBFeHQgT0YvRFNJRiI7UlNWUD1UUlVFOm1haWx0bzphZmVuYXlyb3UuZXh0QG9yYW4NCglnZS5jb20NCkFUVEVOREVFO0NOPSJCRUxPVUJBRCBNeXJpYW0gRXh0IE9GL0RTSUYiO1JTVlA9VFJVRTptYWlsdG86bWJlbG91YmFkLmV4dEBvcg0KCWFuZ2UuY29tDQpBVFRFTkRFRTtDTj0iTEFWQUJSRSBDbMOpbWVudCBPRi9EU0lGIjtSU1ZQPVRSVUU6bWFpbHRvOmNsZW1lbnQubGF2YWJyZUBvcmENCgluZ2UuY29tDQpDTEFTUzpQVUJMSUMNCkNSRUFURUQ6MjAxNDA0MjNUMTIxODQ3Wg0KREVTQ1JJUFRJT046Qm9uam91ciB0b3V0IGxlIG1vbmRlLG5uQXByw6hzIDIgYW5zIHBhc3PDqXMgYXUgc2VpbiBkZSBs4oCZDQoJw6lxdWlwZSBMZWdhY3ksIGxlIHRlbXBzIGVzdCB2ZW51IHBvdXIgbW9pIGRlIHBhcnRpciB2ZXJzIGTigJlhdXRyZXMgYXZlbg0KCXR1cmVz4oCmLm5uSmUgdm91cyBpbnZpdGUgw6AgcGFydGFnZXIgdW4gcGV0aXQtZMOpamV1bmVyIGxlIE1lcmNyZWRpIDMwIA0KCWF2cmlsIDIwMTQgw6AgMTBoMDAgZGFucyBs4oCZb3BlbnNwYWNlIDk0N0Iubm5O4oCZaMOpc2l0ZXogcGFzIMOgIHRyYW5zZg0KCcOpcmVyIGzigJlpbnZpdGF0aW9uIGF1eCBwZXJzb25uZXMgcXVlIGrigJlhdXJhaXMgb3VibGnDqS5ubm5Db3JkaWFsZW1lDQoJbnQsblRhcmlrIEZBUklTbm4NCkRURU5EO1RaSUQ9IlJvbWFuY2UgU3RhbmRhcmQgVGltZSI6MjAxNDA0MzBUMTAzMDAwDQpEVFNUQU1QOjIwMTQwNDIzVDEyMTgzM1oNCkRUU1RBUlQ7VFpJRD0iUm9tYW5jZSBTdGFuZGFyZCBUaW1lIjoyMDE0MDQzMFQxMDAwMDANCkxBU1QtTU9ESUZJRUQ6MjAxNDA0MjNUMTIxODQ3Wg0KTE9DQVRJT046b3BlbnNwYWNlIDk0N0INCk9SR0FOSVpFUjtDTj0iRkFSSVMgVGFyaWsgRXh0IDEgT0YvRFNJRiI6bWFpbHRvOnRhZmFyaXMuZXh0QG9yYW5nZS5jb20NClBSSU9SSVRZOjUNClNFUVVFTkNFOjANClNVTU1BUlk7TEFOR1VBR0U9ZnI6UG90IGRlIGTDqXBhcnQgDQpUUkFOU1A6T1BBUVVFDQpVSUQ6MDQwMDAwMDA4MjAwRTAwMDc0QzVCNzEwMUE4MkUwMDgwMDAwMDAwMEQwOTU5MzAwRkU1RUNGMDEwMDAwMDAwMDAwMDAwMDANCgkwMTAwMDAwMDBBMEI5Mzk2RkI5N0E4RjRFOEQ3REVGMkVBNzlGOEQ0Qw0KWC1BTFQtREVTQztGTVRUWVBFPXRleHQvaHRtbDo8IURPQ1RZUEUgSFRNTCBQVUJMSUMgIi0vL1czQy8vRFREIEhUTUwgMy4yLy9FDQoJTiI+bjxIVE1MPm48SEVBRD5uPE1FVEEgTkFNRT0iR2VuZXJhdG9yIiBDT05URU5UPSJNUyBFeGNoYW5nZSBTZXJ2ZXIgdmUNCglyc2lvbiAxNC4wMi41MDA0LjAwMCI+bjxUSVRMRT48L1RJVExFPm48L0hFQUQ+bjxCT0RZPm48IS0tIENvbnZlcnRlZCBmDQoJcm9tIHRleHQvcnRmIGZvcm1hdCAtLT5ubjxQIERJUj1MVFI+PFNQQU4gTEFORz0iZnIiPjwvU1BBTj48U1BBTiBMQU5HPSJmDQoJciI+PEZPTlQgRkFDRT0iQ2FsaWJyaSI+Qm9uam91ciB0b3V0IGxlIG1vbmRlLDwvRk9OVD48L1NQQU4+PC9QPm5uPFAgREkNCglSPUxUUj48U1BBTiBMQU5HPSJmciI+PC9TUEFOPjxTUEFOIExBTkc9ImZyIj48L1NQQU4+PFNQQU4gTEFORz0iZnIiPjwvU1BBTg0KCT48L1A+bm48UCBESVI9TFRSPjxTUEFOIExBTkc9ImZyIj48L1NQQU4+PFNQQU4gTEFORz0iZnIiPjxGT05UIEZBQ0U9IkNhbA0KCWlicmkiPkFwcsOocyAyIGFucyBwYXNzw6lzIGF1IHNlaW4gZGUgbOKAmcOpcXVpcGUgTGVnYWN5LCBsZSB0ZW1wcyBlc3QgdmUNCgludSBwb3VyIG1vaSBkZSBwYXJ0aXIgdmVycyBk4oCZYXV0cmVzIGF2ZW50dXJlc+KApi48L0ZPTlQ+PC9TUEFOPjwvUD5ubjwNCglQIERJUj1MVFI+PFNQQU4gTEFORz0iZnIiPjxGT05UIEZBQ0U9IkNhbGlicmkiPkplIHZvdXMgaW52aXRlIMOgIHBhcnRhZ2VyIA0KCXVuIHBldGl0LWTDqWpldW5lciBsZSBNZXJjcmVkaSAzMCBhdnJpbCAyMDE0IMOgIDEwaDAwIGRhbnMgbOKAmW9wZW5zcGFjZSA5DQoJNDdCLjwvRk9OVD48L1NQQU4+PC9QPm5uPFAgRElSPUxUUj48U1BBTiBMQU5HPSJmciI+PEZPTlQgRkFDRT0iQ2FsaWJyaSI+DQoJTuKAmWjDqXNpdGV6IHBhcyDDoCB0cmFuc2bDqXJlciBs4oCZaW52aXRhdGlvbiBhdXggcGVyc29ubmVzIHF1ZSBq4oCZYXVyYWkNCglzIG91Ymxpw6kuPC9GT05UPjwvU1BBTj48L1A+bjxCUj5ubjxQIERJUj1MVFI+PFNQQU4gTEFORz0iZnIiPjxGT05UIEZBQw0KCUU9IkNhbGlicmkiPkNvcmRpYWxlbWVudCw8L0ZPTlQ+PC9TUEFOPjwvUD5ubjxQIERJUj1MVFI+PFNQQU4gTEFORz0iZnIiDQoJPjxGT05UIEZBQ0U9IkNhbGlicmkiPlRhcmlrIEZBUklTPC9GT05UPjwvU1BBTj48U1BBTiBMQU5HPSJmciI+PC9TUEFOPjxTUEENCglOIExBTkc9ImZyIj48L1NQQU4+PC9QPm5uPFAgRElSPUxUUj48U1BBTiBMQU5HPSJmciI+PC9TUEFOPjxTUEFOIExBTkc9ImYNCglyIj48L1NQQU4+PFNQQU4gTEFORz0iZnIiPjwvU1BBTj48L1A+bm48L0JPRFk+bjwvSFRNTD4NClgtTUlDUk9TT0ZULUNETy1CVVNZU1RBVFVTOlRFTlRBVElWRQ0KWC1NSUNST1NPRlQtQ0RPLUlNUE9SVEFOQ0U6MQ0KWC1NSUNST1NPRlQtRElTQUxMT1ctQ09VTlRFUjpGQUxTRQ0KWC1NUy1PTEstQVVUT1NUQVJUQ0hFQ0s6RkFMU0UNClgtTVMtT0xLLUNPTkZUWVBFOjANCkJFR0lOOlZBTEFSTQ0KVFJJR0dFUjotUFQxNU0NCkFDVElPTjpESVNQTEFZDQpERVNDUklQVElPTjpSZW1pbmRlcg0KRU5EOlZBTEFSTQ0KRU5EOlZFVkVOVA0KQkVHSU46VkVWRU5UDQpBVFRFTkRFRTtDTj0iTEFWQUJSRSBDbMOpbWVudCBPRi9EU0lGIjtSU1ZQPVRSVUU6bWFpbHRvOmNsZW1lbnQubGF2YWJyZUBvcmENCgluZ2UuY29tDQpBVFRFTkRFRTtDTj1jaHJpc3RvcGhlLmNvbWJldEBncmVlbi1jb25zZWlsLmNvbTtSU1ZQPVRSVUU6bWFpbHRvOmNocmlzdG9waGUNCgkuY29tYmV0QGdyZWVuLWNvbnNlaWwuY29tDQpBVFRFTkRFRTtDTj1vbGl2aWVyLnZhbnNvbkBncmVlbi1jb25zZWlsLmNvbTtSU1ZQPVRSVUU6bWFpbHRvOm9saXZpZXIudmFuc28NCgluQGdyZWVuLWNvbnNlaWwuY29tDQpBVFRFTkRFRTtDTj1nZW9yZ2VzLnJvY2NvQGdyZWVuLWNvbnNlaWwuY29tO1JTVlA9VFJVRTptYWlsdG86Z2Vvcmdlcy5yb2Njb0ANCglncmVlbi1jb25zZWlsLmNvbQ0KQ0xBU1M6UFVCTElDDQpDUkVBVEVEOjIwMTQwNDI0VDE0MjAwM1oNCkRFU0NSSVBUSU9OOm5Ob20JTW90IGRlIHBhc3NlCU7CsCBkZSBwb250CURhdGUgKEFBQUEtTU0tSkopCUhldXJlIGRlIGTDqWJ1DQoJdAlGdXNlYXV4IGhvcmFpcmUJblBvaW5MTzI5MDQyMDE0CTI1MDQyMDE0CSszMyAxIDU4IDk5IDUzIDg4CTIwMTQtMDQtMjUJMQ0KCTA6MzAJKEdNVCswMTowMCkgQnJ1eGVsbGVzLCBDb3BlbmhhZ3VlLCBNYWRyaWQsIFBhcmlzIChoZXVyZSBkJ8OpdMOpKQkNCglublZvdXMgcG91dmV6IGZvdXJuaXIgw6Agdm9zIGludml0w6lzIGxlcyBsaWVucyBzdWl2YW50cyBwb3VyIGxldXIgcGVybWV0DQoJdHJlIGRlIHJlam9pbmRyZSBsYSBjb25mw6lyZW5jZSBmYWNpbGVtZW50IGVuIHF1ZWxxdWVzIGNsaWNzIDogbioJZGVwdWlzIA0KCUlOVFJBTkVUIDogY2xpcXVleiBpY2kgPGh0dHBzOi8vbW9uc2kuc3NvLmZyYW5jZXRlbGVjb20uZnIvaW5kZXguYXNwP3RhcmdlDQoJdD1IVFRQJTNBJTJGJTJGY29vcG5ldC5zc28uZnJhbmNldGVsZWNvbS5mciUyRkRlZmF1bHQuYXNweCUzZlJldHVyblVybCUzZCUNCgkyNTJmRGlyZWN0QWNjZXNzJTI1MmZTdGFydENvbmZlcmVuY2VCeVVybC5hc3B4JTI1M2ZjcElkJTI1M2RGRDA3MTlGNi1ERTdFLQ0KCTRBRTctOUE0OC1GMDJBNjY1NDE2QkU+ICBuKglkZXB1aXMgSU5URVJORVQgOiBjbGlxdWV6IGljaSA8aHR0cHM6Ly9jb29wbmUNCgl0Lm11bHRpbWVkaWEtY29uZmVyZW5jZS5vcmFuZ2UtYnVzaW5lc3MuY29tL0RpcmVjdEFjY2Vzcy9TdGFydENvbmZlcmVuY2VCeQ0KCVVybC5hc3B4P2NwSWQ9RkQwNzE5RjYtREU3RS00QUU3LTlBNDgtRjAyQTY2NTQxNkJFPiAgbm4NCkRURU5EO1RaSUQ9IlJvbWFuY2UgU3RhbmRhcmQgVGltZSI6MjAxNDA0MjVUMTEzMDAwDQpEVFNUQU1QOjIwMTQwNDI0VDE0MjAwMFoNCkRUU1RBUlQ7VFpJRD0iUm9tYW5jZSBTdGFuZGFyZCBUaW1lIjoyMDE0MDQyNVQxMDMwMDANCkxBU1QtTU9ESUZJRUQ6MjAxNDA0MjVUMjExOTUxWg0KTE9DQVRJT046KzMzIDEgNTggOTkgNTMgODgNCk9SR0FOSVpFUjtDTj0iRkVOQVlST1UgQW5uZSBFeHQgT0YvRFNJRiI6bWFpbHRvOmFmZW5heXJvdS5leHRAb3JhbmdlLmNvbQ0KUFJJT1JJVFk6NQ0KU0VRVUVOQ0U6MA0KU1VNTUFSWTtMQU5HVUFHRT1mcjpQb2ludCBMTw0KVFJBTlNQOk9QQVFVRQ0KVUlEOjA0MDAwMDAwODIwMEUwMDA3NEM1QjcxMDFBODJFMDA4MDAwMDAwMDBFMEVGODQwQUQ5NUZDRjAxMDAwMDAwMDAwMDAwMDAwDQoJMDEwMDAwMDAwOTNCNDkxQTgzNzI0RTc0OUE1OEZCQUVENzA4M0Q2MDcNClgtQUxULURFU0M7Rk1UVFlQRT10ZXh0L2h0bWw6PCFET0NUWVBFIEhUTUwgUFVCTElDICItLy9XM0MvL0RURCBIVE1MIDMuMi8vRQ0KCU4iPm48SFRNTD5uPEhFQUQ+bjxNRVRBIE5BTUU9IkdlbmVyYXRvciIgQ09OVEVOVD0iTVMgRXhjaGFuZ2UgU2VydmVyIHZlDQoJcnNpb24gMTQuMDIuNTAwNC4wMDAiPm48VElUTEU+PC9USVRMRT5uPC9IRUFEPm48Qk9EWT5uPCEtLSBDb252ZXJ0ZWQgZg0KCXJvbSB0ZXh0L3J0ZiBmb3JtYXQgLS0+bm48UCBESVI9TFRSPjxTUEFOIExBTkc9ImZyIj48L1NQQU4+PFNQQU4gTEFORz0iZg0KCXIiPjwvU1BBTj48U1BBTiBMQU5HPSJmciI+PC9TUEFOPjxTUEFOIExBTkc9ImZyIj48L1NQQU4+PC9QPm5uPFAgRElSPUxUUg0KCSBBTElHTj1DRU5URVI+PFNQQU4gTEFORz0iZnIiPjxCPjwvQj48L1NQQU4+PFNQQU4gTEFORz0iZnIiPjxCPjwvQj48L1NQQU4+DQoJPFNQQU4gTEFORz0iZnIiPjxCPjwvQj48L1NQQU4+PEI+PFNQQU4gTEFORz0iZnIiPjxGT05UIEZBQ0U9IlRpbWVzIE5ldyBSb20NCglhbiI+Tm9tJm5ic3A7Jm5ic3A7Jm5ic3A7Jm5ic3A7IE1vdCBkZSBwYXNzZSZuYnNwOyZuYnNwOyZuYnNwOyBOwrAgDQoJZGUgcG9udCZuYnNwOyZuYnNwOyZuYnNwOyZuYnNwOyZuYnNwOyBEYXRlIChBQUFBLU1NLUpKKSZuYnNwOyZuYnNwOw0KCSZuYnNwOyZuYnNwOyZuYnNwOyZuYnNwOyBIZXVyZSBkZSBkw6lidXQmbmJzcDsgRnVzZWF1eCBob3JhaXJlPC9GT05UPg0KCTwvU1BBTj48L0I+PFNQQU4gTEFORz0iZnIiPjwvU1BBTj48U1BBTiBMQU5HPSJmciI+PC9TUEFOPjxTUEFOIExBTkc9ImZyIj48DQoJL1NQQU4+PFNQQU4gTEFORz0iZnIiPjxCUj5uPC9TUEFOPjxTUEFOIExBTkc9ImZyIj48L1NQQU4+PFNQQU4gTEFORz0iZnIiPg0KCTwvU1BBTj48U1BBTiBMQU5HPSJmciI+PC9TUEFOPjxTUEFOIExBTkc9ImZyIj48Rk9OVCBGQUNFPSJUaW1lcyBOZXcgUm9tYW4iDQoJPlBvaW5MTzI5MDQyMDE0Jm5ic3A7IDI1MDQyMDE0Jm5ic3A7Jm5ic3A7Jm5ic3A7Jm5ic3A7Jm5ic3A7Jm5ic3A7Jg0KCW5ic3A7ICszMyAxIDU4IDk5IDUzIDg4Jm5ic3A7Jm5ic3A7Jm5ic3A7Jm5ic3A7Jm5ic3A7Jm5ic3A7IDIwMTQtMDQNCgktMjUmbmJzcDsmbmJzcDsmbmJzcDsmbmJzcDsmbmJzcDsgMTA6MzAmbmJzcDsmbmJzcDsgKEdNVCswMTowMCkgQnJ1DQoJeGVsbGVzLCBDb3BlbmhhZ3VlLCBNYWRyaWQsIFBhcmlzIChoZXVyZSBkJ8OpdMOpKSZuYnNwOzwvRk9OVD48L1NQQU4+PA0KCVNQQU4gTEFORz0iZnIiPjwvU1BBTj48U1BBTiBMQU5HPSJmciI+PC9TUEFOPjxTUEFOIExBTkc9ImZyIj48L1NQQU4+PFNQQU4gDQoJTEFORz0iZnIiPjxCUj5uPC9TUEFOPjxTUEFOIExBTkc9ImZyIj48L1NQQU4+PFNQQU4gTEFORz0iZnIiPjwvU1BBTj48U1BBTg0KCSBMQU5HPSJmciI+PC9TUEFOPjxTUEFOIExBTkc9ImZyIj48QlI+bjxGT05UIFNJWkU9MiBGQUNFPSJBcmlhbCI+Vm91cyBwb3UNCgl2ZXogZm91cm5pciDDoCB2b3MgaW52aXTDqXMgbGVzIGxpZW5zIHN1aXZhbnRzIHBvdXIgbGV1ciBwZXJtZXR0cmUgZGUgcmVqbw0KCWluZHJlIGxhIGNvbmbDqXJlbmNlIGZhY2lsZW1lbnQgZW4gcXVlbHF1ZXMgY2xpY3MgOiA8L0ZPTlQ+PC9TUEFOPjwvUD5ubg0KCTxQIERJUj1MVFI+PFNQQU4gTEFORz0iZnIiPjwvU1BBTj48U1BBTiBMQU5HPSJmciI+PC9TUEFOPjxTUEFOIExBTkc9ImZyIj48DQoJRk9OVCBTSVpFPTIgRkFDRT0iU3ltYm9sIj4mIzE4Mzs8Rk9OVCBGQUNFPSJDb3VyaWVyIE5ldyI+Jm5ic3A7Jm5ic3A7Jm4NCglic3A7Jm5ic3A7Jm5ic3A7Jm5ic3A7PC9GT05UPjwvRk9OVD48L1NQQU4+PFNQQU4gTEFORz0iZnIiPjwvU1BBTj48U1BBDQoJTiBMQU5HPSJmciI+PC9TUEFOPjxTUEFOIExBTkc9ImZyIj48L1NQQU4+PFNQQU4gTEFORz0iZnIiPjwvU1BBTj48U1BBTiBMQU4NCglHPSJmciI+IDxGT05UIFNJWkU9MiBGQUNFPSJBcmlhbCI+ZGVwdWlzIElOVFJBTkVUIDo8L0ZPTlQ+PC9TUEFOPjxTUEFOIExBTg0KCUc9ImZyIj4gPC9TUEFOPjxBIEhSRUY9Imh0dHBzOi8vbW9uc2kuc3NvLmZyYW5jZXRlbGVjb20uZnIvaW5kZXguYXNwP3RhcmdlDQoJdD1IVFRQJTNBJTJGJTJGY29vcG5ldC5zc28uZnJhbmNldGVsZWNvbS5mciUyRkRlZmF1bHQuYXNweCUzZlJldHVyblVybCUzZCUNCgkyNTJmRGlyZWN0QWNjZXNzJTI1MmZTdGFydENvbmZlcmVuY2VCeVVybC5hc3B4JTI1M2ZjcElkJTI1M2RGRDA3MTlGNi1ERTdFLQ0KCTRBRTctOUE0OC1GMDJBNjY1NDE2QkUiPjxTUEFOIExBTkc9ImZyIj48L1NQQU4+PFNQQU4gTEFORz0iZnIiPjwvU1BBTj48U1BBDQoJTiBMQU5HPSJmciI+PFU+PC9VPjwvU1BBTj48VT48U1BBTiBMQU5HPSJmciI+PEZPTlQgQ09MT1I9IiMwMDAwRkYiIFNJWkU9MiANCglGQUNFPSJBcmlhbCI+Y2xpcXVleiBpY2k8L0ZPTlQ+PC9TUEFOPjwvVT48U1BBTiBMQU5HPSJmciI+PC9TUEFOPjwvQT48U1BBTg0KCSBMQU5HPSJmciI+PC9TUEFOPjxTUEFOIExBTkc9ImZyIj48L1NQQU4+PFNQQU4gTEFORz0iZnIiPjwvU1BBTj48U1BBTiBMQU5HDQoJPSJmciI+PEZPTlQgU0laRT0yIEZBQ0U9IkFyaWFsIj4gPC9GT05UPjwvU1BBTj48L1A+bm48UCBESVI9TFRSPjxTUEFOIExBDQoJTkc9ImZyIj48L1NQQU4+PFNQQU4gTEFORz0iZnIiPjwvU1BBTj48U1BBTiBMQU5HPSJmciI+PEZPTlQgU0laRT0yIEZBQ0U9IlMNCgl5bWJvbCI+JiMxODM7PEZPTlQgRkFDRT0iQ291cmllciBOZXciPiZuYnNwOyZuYnNwOyZuYnNwOyZuYnNwOyZuYnNwOw0KCSZuYnNwOzwvRk9OVD48L0ZPTlQ+PC9TUEFOPjxTUEFOIExBTkc9ImZyIj4gPEZPTlQgU0laRT0yIEZBQ0U9IkFyaWFsIj5kZXANCgl1aXMgSU5URVJORVQgOjwvRk9OVD48L1NQQU4+PFNQQU4gTEFORz0iZnIiPiA8L1NQQU4+PEEgSFJFRj0iaHR0cHM6Ly9jb29wbg0KCWV0Lm11bHRpbWVkaWEtY29uZmVyZW5jZS5vcmFuZ2UtYnVzaW5lc3MuY29tL0RpcmVjdEFjY2Vzcy9TdGFydENvbmZlcmVuY2VCDQoJeVVybC5hc3B4P2NwSWQ9RkQwNzE5RjYtREU3RS00QUU3LTlBNDgtRjAyQTY2NTQxNkJFIj48U1BBTiBMQU5HPSJmciI+PC9TUEENCglOPjxTUEFOIExBTkc9ImZyIj48L1NQQU4+PFNQQU4gTEFORz0iZnIiPjxVPjwvVT48L1NQQU4+PFU+PFNQQU4gTEFORz0iZnIiPg0KCTxGT05UIENPTE9SPSIjMDAwMEZGIiBTSVpFPTIgRkFDRT0iQXJpYWwiPmNsaXF1ZXogaWNpPC9GT05UPjwvU1BBTj48L1U+PFNQDQoJQU4gTEFORz0iZnIiPjwvU1BBTj48L0E+PFNQQU4gTEFORz0iZnIiPjwvU1BBTj48U1BBTiBMQU5HPSJmciI+PC9TUEFOPjxTUEENCglOIExBTkc9ImZyIj48L1NQQU4+PFNQQU4gTEFORz0iZnIiPjxGT05UIFNJWkU9MiBGQUNFPSJBcmlhbCI+IDwvRk9OVD48L1NQQQ0KCU4+PC9QPm5uPFAgRElSPUxUUj48U1BBTiBMQU5HPSJmciI+PC9TUEFOPjxTUEFOIExBTkc9ImZyIj48L1NQQU4+PFNQQU4gTA0KCUFORz0iZnIiPjwvU1BBTj48L1A+bm48L0JPRFk+bjwvSFRNTD4NClgtTUlDUk9TT0ZULUNETy1CVVNZU1RBVFVTOlRFTlRBVElWRQ0KWC1NSUNST1NPRlQtQ0RPLUlNUE9SVEFOQ0U6MQ0KWC1NSUNST1NPRlQtRElTQUxMT1ctQ09VTlRFUjpGQUxTRQ0KWC1NUy1PTEstQVBQVExBU1RTRVFVRU5DRTowDQpYLU1TLU9MSy1DT05GVFlQRTowDQpFTkQ6VkVWRU5UDQpCRUdJTjpWRVZFTlQNCkNMQVNTOlBVQkxJQw0KQ1JFQVRFRDoyMDE0MDQyNVQyMTE2MjBaDQpERVNDUklQVElPTjpMZSBsb3VwIGF1cmEgdC1pbCB1biBmZXN0aW4gZGFucyBsYSBtaW51dGUgPyBuDQpEVEVORDtUWklEPSJSb21hbmNlIFN0YW5kYXJkIFRpbWUiOjIwMTQwNDI3VDExMzAwMA0KRFRTVEFNUDoyMDE0MDQyNVQyMTI1MTlaDQpEVFNUQVJUO1RaSUQ9IlJvbWFuY2UgU3RhbmRhcmQgVGltZSI6MjAxNDA0MjdUMTAzMDAwDQpMQVNULU1PRElGSUVEOjIwMTQwNDI1VDIxMjEyN1oNCkxPQ0FUSU9OOm1haXNvbiBkZXMgdHJvaXMgcGV0aXRzIGNvY2hvbnMgDQpQUklPUklUWTo1DQpTRVFVRU5DRTowDQpTVU1NQVJZO0xBTkdVQUdFPWZyOnRlc3QgMQ0KVFJBTlNQOk9QQVFVRQ0KVUlEOjA0MDAwMDAwODIwMEUwMDA3NEM1QjcxMDFBODJFMDA4MDAwMDAwMDBCMEZCRThEOURDNjBDRjAxMDAwMDAwMDAwMDAwMDAwDQoJMDEwMDAwMDAwRjdCRjU3REJCQTg5MEM0NUI4ODc4QTMxMjE1N0ZEOTANClgtQUxULURFU0M7Rk1UVFlQRT10ZXh0L2h0bWw6PCFET0NUWVBFIEhUTUwgUFVCTElDICItLy9XM0MvL0RURCBIVE1MIDMuMi8vRQ0KCU4iPm48SFRNTD5uPEhFQUQ+bjxNRVRBIE5BTUU9IkdlbmVyYXRvciIgQ09OVEVOVD0iTVMgRXhjaGFuZ2UgU2VydmVyIHZlDQoJcnNpb24gMTQuMDIuNTAwNC4wMDAiPm48VElUTEU+PC9USVRMRT5uPC9IRUFEPm48Qk9EWT5uPCEtLSBDb252ZXJ0ZWQgZg0KCXJvbSB0ZXh0L3J0ZiBmb3JtYXQgLS0+bm48UCBESVI9TFRSPjxTUEFOIExBTkc9ImZyIj48L1NQQU4+PFNQQU4gTEFORz0iZg0KCXIiPjwvU1BBTj48U1BBTiBMQU5HPSJmciI+PEZPTlQgU0laRT0yIEZBQ0U9IkFyaWFsIj5MZSBsb3VwIGF1cmEgdC1pbCB1biBmDQoJZXN0aW7CoGRhbnMgbGEgbWludXRlID88L0ZPTlQ+PC9TUEFOPjxTUEFOIExBTkc9ImZyIj48L1NQQU4+PFNQQU4gTEFORz0iZnINCgkiPjwvU1BBTj48U1BBTiBMQU5HPSJmciI+IDwvU1BBTj48L1A+bm48L0JPRFk+bjwvSFRNTD4NClgtTUlDUk9TT0ZULUNETy1CVVNZU1RBVFVTOkJVU1kNClgtTUlDUk9TT0ZULUNETy1JTVBPUlRBTkNFOjENClgtTUlDUk9TT0ZULURJU0FMTE9XLUNPVU5URVI6RkFMU0UNClgtTVMtT0xLLUFVVE9GSUxMTE9DQVRJT046RkFMU0UNClgtTVMtT0xLLUNPTkZUWVBFOjANCkJFR0lOOlZBTEFSTQ0KVFJJR0dFUjotUFQzME0NCkFDVElPTjpESVNQTEFZDQpERVNDUklQVElPTjpSZW1pbmRlcg0KRU5EOlZBTEFSTQ0KRU5EOlZFVkVOVA0KQkVHSU46VkVWRU5UDQpDTEFTUzpQVUJMSUMNCkNSRUFURUQ6MjAxNDA0MjVUMjExOTU2Wg0KREVTQ1JJUFRJT046TGUgbG91cCBtYW5nZXJhLXQtaWwgdW4gZGVzIGNvY2hvbnMgZGFucyBs4oCZaGV1cmUgP24NCkRURU5EO1RaSUQ9IlJvbWFuY2UgU3RhbmRhcmQgVGltZSI6MjAxNDA0MjdUMTgzMDAwDQpEVFNUQU1QOjIwMTQwNDI1VDIxMjUxOVoNCkRUU1RBUlQ7VFpJRD0iUm9tYW5jZSBTdGFuZGFyZCBUaW1lIjoyMDE0MDQyN1QxODAwMDANCkxBU1QtTU9ESUZJRUQ6MjAxNDA0MjVUMjExOTU2Wg0KTE9DQVRJT046bWFpc29uIGRlcyB0cm9pcyBwZXRpdHMgY29jaG9ucyANClBSSU9SSVRZOjUNClNFUVVFTkNFOjANClNVTU1BUlk7TEFOR1VBR0U9ZnI6dGVzdCAyDQpUUkFOU1A6T1BBUVVFDQpVSUQ6MDQwMDAwMDA4MjAwRTAwMDc0QzVCNzEwMUE4MkUwMDgwMDAwMDAwMEYwM0U4OEZEREM2MENGMDEwMDAwMDAwMDAwMDAwMDANCgkwMTAwMDAwMDBEOTkyOEJDNzlDMTRGQTRBOEM2MjFFQ0E0RDk4MjUzMQ0KWC1BTFQtREVTQztGTVRUWVBFPXRleHQvaHRtbDo8IURPQ1RZUEUgSFRNTCBQVUJMSUMgIi0vL1czQy8vRFREIEhUTUwgMy4yLy9FDQoJTiI+bjxIVE1MPm48SEVBRD5uPE1FVEEgTkFNRT0iR2VuZXJhdG9yIiBDT05URU5UPSJNUyBFeGNoYW5nZSBTZXJ2ZXIgdmUNCglyc2lvbiAxNC4wMi41MDA0LjAwMCI+bjxUSVRMRT48L1RJVExFPm48L0hFQUQ+bjxCT0RZPm48IS0tIENvbnZlcnRlZCBmDQoJcm9tIHRleHQvcnRmIGZvcm1hdCAtLT5ubjxQIERJUj1MVFI+PFNQQU4gTEFORz0iZnIiPjwvU1BBTj48U1BBTiBMQU5HPSJmDQoJciI+PC9TUEFOPjxTUEFOIExBTkc9ImZyIj48Rk9OVCBTSVpFPTIgRkFDRT0iQXJpYWwiPkxlIGxvdXAgbWFuZ2VyYS10LWlsIHUNCgluIGRlcyBjb2Nob25zIGRhbnMgbOKAmWhldXJlwqA/PC9GT05UPjwvU1BBTj48U1BBTiBMQU5HPSJmciI+PC9TUEFOPjxTUEFOIA0KCUxBTkc9ImZyIj48L1NQQU4+PFNQQU4gTEFORz0iZnIiPjwvU1BBTj48L1A+bm48L0JPRFk+bjwvSFRNTD4NClgtTUlDUk9TT0ZULUNETy1CVVNZU1RBVFVTOkJVU1kNClgtTUlDUk9TT0ZULUNETy1JTVBPUlRBTkNFOjENClgtTUlDUk9TT0ZULURJU0FMTE9XLUNPVU5URVI6RkFMU0UNClgtTVMtT0xLLUFVVE9GSUxMTE9DQVRJT046RkFMU0UNClgtTVMtT0xLLUNPTkZUWVBFOjANCkJFR0lOOlZBTEFSTQ0KVFJJR0dFUjotUFQ2ME0NCkFDVElPTjpESVNQTEFZDQpERVNDUklQVElPTjpSZW1pbmRlcg0KRU5EOlZBTEFSTQ0KRU5EOlZFVkVOVA0KQkVHSU46VkVWRU5UDQpDTEFTUzpQVUJMSUMNCkNSRUFURUQ6MjAxNDA0MjVUMjEyMTMyWg0KREVTQ1JJUFRJT046bg0KRFRFTkQ7VFpJRD0iUm9tYW5jZSBTdGFuZGFyZCBUaW1lIjoyMDE0MDQyN1QxODAwMDANCkRUU1RBTVA6MjAxNDA0MjVUMjEyNTE5Wg0KRFRTVEFSVDtUWklEPSJSb21hbmNlIFN0YW5kYXJkIFRpbWUiOjIwMTQwNDI3VDE3MzAwMA0KTEFTVC1NT0RJRklFRDoyMDE0MDQyNVQyMTIxMzJaDQpQUklPUklUWTo1DQpTRVFVRU5DRTowDQpTVU1NQVJZO0xBTkdVQUdFPWZyOg0KVFJBTlNQOk9QQVFVRQ0KVUlEOjA0MDAwMDAwODIwMEUwMDA3NEM1QjcxMDFBODJFMDA4MDAwMDAwMDA4MDZCNjgzOERENjBDRjAxMDAwMDAwMDAwMDAwMDAwDQoJMDEwMDAwMDAwQjMyMjQ5NUE0NDUxMkI0MTg2MjFBODI3OEJEMUY0RTYNClgtQUxULURFU0M7Rk1UVFlQRT10ZXh0L2h0bWw6PCFET0NUWVBFIEhUTUwgUFVCTElDICItLy9XM0MvL0RURCBIVE1MIDMuMi8vRQ0KCU4iPm48SFRNTD5uPEhFQUQ+bjxNRVRBIE5BTUU9IkdlbmVyYXRvciIgQ09OVEVOVD0iTVMgRXhjaGFuZ2UgU2VydmVyIHZlDQoJcnNpb24gMTQuMDIuNTAwNC4wMDAiPm48VElUTEU+PC9USVRMRT5uPC9IRUFEPm48Qk9EWT5uPCEtLSBDb252ZXJ0ZWQgZg0KCXJvbSB0ZXh0L3J0ZiBmb3JtYXQgLS0+bm48UCBESVI9TFRSPjxTUEFOIExBTkc9ImZyIj48L1NQQU4+PFNQQU4gTEFORz0iZg0KCXIiPjwvU1BBTj48U1BBTiBMQU5HPSJmciI+PC9TUEFOPjwvUD5ubjwvQk9EWT5uPC9IVE1MPg0KWC1NSUNST1NPRlQtQ0RPLUJVU1lTVEFUVVM6QlVTWQ0KWC1NSUNST1NPRlQtQ0RPLUlNUE9SVEFOQ0U6MQ0KWC1NSUNST1NPRlQtRElTQUxMT1ctQ09VTlRFUjpGQUxTRQ0KWC1NUy1PTEstQVVUT0ZJTExMT0NBVElPTjpUUlVFDQpYLU1TLU9MSy1DT05GVFlQRTowDQpCRUdJTjpWQUxBUk0NClRSSUdHRVI6LVBUMTVNDQpBQ1RJT046RElTUExBWQ0KREVTQ1JJUFRJT046UmVtaW5kZXINCkVORDpWQUxBUk0NCkVORDpWRVZFTlQNCkJFR0lOOlZFVkVOVA0KQ0xBU1M6UFVCTElDDQpDUkVBVEVEOjIwMTQwNDI1VDIxMjI1OFoNCkRFU0NSSVBUSU9OOkxlIGxvdXAgbWFuZ2VyYSB0LWlsIGRhbnMgbOKAmWhldXJlID9uDQpEVEVORDtUWklEPSJSb21hbmNlIFN0YW5kYXJkIFRpbWUiOjIwMTQwNDI3VDEyMzAwMA0KRFRTVEFNUDoyMDE0MDQyNVQyMTI1MTlaDQpEVFNUQVJUO1RaSUQ9IlJvbWFuY2UgU3RhbmRhcmQgVGltZSI6MjAxNDA0MjdUMTIwMDAwDQpMQVNULU1PRElGSUVEOjIwMTQwNDI1VDIxMjI1OFoNCkxPQ0FUSU9OOm1haXNvbiBkZXMgdHJvaXMgcGV0aXRzIGNvY2hvbnMgDQpQUklPUklUWTo1DQpTRVFVRU5DRTowDQpTVU1NQVJZO0xBTkdVQUdFPWZyOnRlc3QgMg0KVFJBTlNQOk9QQVFVRQ0KVUlEOjA0MDAwMDAwODIwMEUwMDA3NEM1QjcxMDFBODJFMDA4MDAwMDAwMDA4MDlBRkM2MERENjBDRjAxMDAwMDAwMDAwMDAwMDAwDQoJMDEwMDAwMDAwQTJDRjMyRUUxQkIyNEE0QjlEQjY0QjE4OEI2MDI1MTENClgtQUxULURFU0M7Rk1UVFlQRT10ZXh0L2h0bWw6PCFET0NUWVBFIEhUTUwgUFVCTElDICItLy9XM0MvL0RURCBIVE1MIDMuMi8vRQ0KCU4iPm48SFRNTD5uPEhFQUQ+bjxNRVRBIE5BTUU9IkdlbmVyYXRvciIgQ09OVEVOVD0iTVMgRXhjaGFuZ2UgU2VydmVyIHZlDQoJcnNpb24gMTQuMDIuNTAwNC4wMDAiPm48VElUTEU+PC9USVRMRT5uPC9IRUFEPm48Qk9EWT5uPCEtLSBDb252ZXJ0ZWQgZg0KCXJvbSB0ZXh0L3J0ZiBmb3JtYXQgLS0+bm48UCBESVI9TFRSPjxTUEFOIExBTkc9ImZyIj48L1NQQU4+PFNQQU4gTEFORz0iZg0KCXIiPjwvU1BBTj48U1BBTiBMQU5HPSJmciI+PEZPTlQgU0laRT0yIEZBQ0U9IkFyaWFsIj5MZSBsb3VwIG1hbmdlcmEgdC1pbCBkDQoJYW5zIGzigJloZXVyZcKgPzwvRk9OVD48L1NQQU4+PFNQQU4gTEFORz0iZnIiPjwvU1BBTj48U1BBTiBMQU5HPSJmciI+PC9TUEENCglOPjxTUEFOIExBTkc9ImZyIj48L1NQQU4+PC9QPm5uPC9CT0RZPm48L0hUTUw+DQpYLU1JQ1JPU09GVC1DRE8tQlVTWVNUQVRVUzpCVVNZDQpYLU1JQ1JPU09GVC1DRE8tSU1QT1JUQU5DRToxDQpYLU1JQ1JPU09GVC1ESVNBTExPVy1DT1VOVEVSOkZBTFNFDQpYLU1TLU9MSy1BVVRPRklMTExPQ0FUSU9OOkZBTFNFDQpYLU1TLU9MSy1DT05GVFlQRTowDQpCRUdJTjpWQUxBUk0NClRSSUdHRVI6LVBUNjBNDQpBQ1RJT046RElTUExBWQ0KREVTQ1JJUFRJT046UmVtaW5kZXINCkVORDpWQUxBUk0NCkVORDpWRVZFTlQNCkJFR0lOOlZFVkVOVA0KQ0xBU1M6UFVCTElDDQpDUkVBVEVEOjIwMTQwNDI1VDIxMjMzN1oNCkRFU0NSSVBUSU9OOkxlIGxvdXAgbWFuZ2VyYSB0LWlsIGxhIHNlbWFpbmUgcHJvY2hhaW5lID9uDQpEVEVORDtUWklEPSJSb21hbmNlIFN0YW5kYXJkIFRpbWUiOjIwMTQwNTA0VDEyMzAwMA0KRFRTVEFNUDoyMDE0MDQyNVQyMTI1MTlaDQpEVFNUQVJUO1RaSUQ9IlJvbWFuY2UgU3RhbmRhcmQgVGltZSI6MjAxNDA1MDRUMTIwMDAwDQpMQVNULU1PRElGSUVEOjIwMTQwNDI1VDIxMjMzN1oNCkxPQ0FUSU9OOm1haXNvbiBkZXMgdHJvaXMgcGV0aXRzIGNvY2hvbnMgDQpQUklPUklUWTo1DQpTRVFVRU5DRTowDQpTVU1NQVJZO0xBTkdVQUdFPWZyOnRlc3QgMw0KVFJBTlNQOk9QQVFVRQ0KVUlEOjA0MDAwMDAwODIwMEUwMDA3NEM1QjcxMDFBODJFMDA4MDAwMDAwMDBBMERBMDM3Q0RENjBDRjAxMDAwMDAwMDAwMDAwMDAwDQoJMDEwMDAwMDAwMTIyRjY4RjA5NkRGMUE0NTk1MjdFMkEzN0IzODc5OEQNClgtQUxULURFU0M7Rk1UVFlQRT10ZXh0L2h0bWw6PCFET0NUWVBFIEhUTUwgUFVCTElDICItLy9XM0MvL0RURCBIVE1MIDMuMi8vRQ0KCU4iPm48SFRNTD5uPEhFQUQ+bjxNRVRBIE5BTUU9IkdlbmVyYXRvciIgQ09OVEVOVD0iTVMgRXhjaGFuZ2UgU2VydmVyIHZlDQoJcnNpb24gMTQuMDIuNTAwNC4wMDAiPm48VElUTEU+PC9USVRMRT5uPC9IRUFEPm48Qk9EWT5uPCEtLSBDb252ZXJ0ZWQgZg0KCXJvbSB0ZXh0L3J0ZiBmb3JtYXQgLS0+bm48UCBESVI9TFRSPjxTUEFOIExBTkc9ImZyIj48L1NQQU4+PFNQQU4gTEFORz0iZg0KCXIiPjwvU1BBTj48U1BBTiBMQU5HPSJmciI+PEZPTlQgU0laRT0yIEZBQ0U9IkFyaWFsIj5MZSBsb3VwIG1hbmdlcmEgdC1pbCBsDQoJYSBzZW1haW5lIHByb2NoYWluZcKgPzwvRk9OVD48L1NQQU4+PFNQQU4gTEFORz0iZnIiPjwvU1BBTj48U1BBTiBMQU5HPSJmciINCgk+PC9TUEFOPjxTUEFOIExBTkc9ImZyIj48L1NQQU4+PC9QPm5uPC9CT0RZPm48L0hUTUw+DQpYLU1JQ1JPU09GVC1DRE8tQlVTWVNUQVRVUzpCVVNZDQpYLU1JQ1JPU09GVC1DRE8tSU1QT1JUQU5DRToxDQpYLU1JQ1JPU09GVC1ESVNBTExPVy1DT1VOVEVSOkZBTFNFDQpYLU1TLU9MSy1BVVRPRklMTExPQ0FUSU9OOkZBTFNFDQpYLU1TLU9MSy1DT05GVFlQRTowDQpCRUdJTjpWQUxBUk0NClRSSUdHRVI6LVBUMTQ0ME0NCkFDVElPTjpESVNQTEFZDQpERVNDUklQVElPTjpSZW1pbmRlcg0KRU5EOlZBTEFSTQ0KRU5EOlZFVkVOVA0KRU5EOlZDQUxFTkRBUg==";
		  var decodedData = window.atob(encodedData);

		  icalParser.parseIcal(decodedData);
		  //icalParser.ical is now set
		  icalParser.ical.version;
		  icalParser.ical.prodid;

			var startDate;
			var startTime;
			var endDate;
			var endTime;
			var dstampDate;
			var dstampTime;
			var uid=''
			var trigger='';
			var action='';
			var location='';
			var summary='';
			var description='';
			var tab = new Array();

			for(var key in icalParser.ical.events)
		 {
			tab[key]=new Array();
			if (icalParser.ical.events[key].dtstart==null || icalParser.ical.events[key]=== undefined || icalParser.ical.events[key].dtstart=== undefined)  console.log("description  null/undefined" );
			else{
				startDate=ParseICSDate(icalParser.ical.events[key].dtstart['value'],'date');
				startTime=ParseICSDate(icalParser.ical.events[key].dtstart['value'],'time');
				tab[key]['startDate'] = startDate;
				tab[key]['startTime'] = startTime;
			}

			if (icalParser.ical.events[key].dtend==null || icalParser.ical.events[key]=== undefined || icalParser.ical.events[key].dtend=== undefined)  console.log("description  null/undefined" );
			else
			{
				endDate=ParseICSDate(icalParser.ical.events[key].dtend['value'],'date');
				endTime=ParseICSDate(icalParser.ical.events[key].dtend['value'],'time');
				tab[key]['endDate'] = endDate;
				tab[key]['endTime'] = endTime;
			}

			if (icalParser.ical.events[key].uid==null || icalParser.ical.events[key]=== undefined || icalParser.ical.events[key].uid=== undefined)  console.log("description  null/undefined" );
			else
			{
				uid = icalParser.ical.events[key].uid['value'];
				tab[key]['uid'] = uid;
			}

			if (icalParser.ical.events[key].description==null || icalParser.ical.events[key]=== undefined || icalParser.ical.events[key].description=== undefined)  console.log("description  null/undefined" );
			else
			{
				description = icalParser.ical.events[key].description['value'];
				tab[key]['description'] = description;
			}

			if (icalParser.ical.events[key].trigger==null || icalParser.ical.events[key]=== undefined || icalParser.ical.events[key].trigger=== undefined)  console.log("trigger  null/undefined" );
			else
			{
				trigger = icalParser.ical.events[key].trigger['value'];
				tab[key]['trigger'] = trigger;
			}

			if (icalParser.ical.events[key].action==null || icalParser.ical.events[key]=== undefined || icalParser.ical.events[key].action=== undefined)  console.log("action  null/undefined" );
			else
			{
				action = icalParser.ical.events[key].action['value'];
				tab[key]['action'] = action;
			}

			if (icalParser.ical.events[key].location==null || icalParser.ical.events[key]=== undefined || icalParser.ical.events[key].location=== undefined)  console.log("location  null/undefined" );
			else
			{
				location=icalParser.ical.events[key].location['value'];
				tab[key]['location'] = location;
			}

			if (icalParser.ical.events[key].summary==null || icalParser.ical.events[key]=== undefined || icalParser.ical.events[key].summary=== undefined)  console.log("summary  null/undefined" );
			else
			{
				summary=icalParser.ical.events[key].summary['value'];
				tab[key]['summary'] = summary;
			}




		 if (icalParser.ical.events[key].trigger==null || icalParser.ical.events[key]=== undefined || icalParser.ical.events[key].trigger=== undefined)  console.log("trigger  null/undefined" );
			else
			{
							tab[key]['trigger'] = trigger;

		 //enregistrement des alarms
		 var template = Calendar.Templates.Alarm;
		  var alarms = [];

		  alarms.push({
				trigger: trigger
			  });

		 elem.alarmList.innerHTML = template.picker.renderEach(alarms).join('');
		 }
		//return formICSdata(summary, location, description ,startDate, startTime,endDate, endTime ,action ,trigger) ;

		}
			return tab;
	}
	return Icstotab(this);
	     // create model data
		 // for(var key in new_tab)
		 // {
			  // console.log(new_tab[key]);
			  // var data = formICSdata(new_tab[key]['summary'], new_tab[key]['location'], new_tab[key]['description'], new_tab[key]['startDate'], new_tab[key]['startTime'], new_tab[key]['endDate'], new_tab[key]['endTime'], new_tab[key]['action'], new_tab[key]['trigger'] )
			  // var errors;

			  // // we check explicitly for true, because the alternative
			  // // is an error object.
			  // if ((errors = this.event.updateAttributes(data)) !== true) {
				// this.showErrors(errors);
				// return;
			  // }

			  // // can't create without a calendar id
			  // // because of defaults this should be impossible.
			  // if (!data.calendarId) {
				// return;
			  // }

			  // var self = this;
			  // var provider;

			  // this.store.providerFor(this.event, fetchProvider);
		 // }

      // function fetchProvider(err, result) {
        // provider = result;
        // provider.eventCapabilities(
          // self.event.data,
          // verifyCaps
        // );
      // }

	  
      // function verifyCaps(err, caps) {
        // if (err) {
          // console.log('Error fetching capabilities for', self.event);
          // return;
        // }
	
	function formICSdata(arg_summary,arg_location,arg_description,arg_dstartDate, arg_dstartTime,arg_dtendDate, arg_dtendTime ,arg_action,arg_trigger)
	{

      var fields = {
        title: arg_summary,
        location: arg_location,
        description: arg_description,
        calendarId: "local-first"
      };

      var startTime = arg_dstartTime;
      var endTime = arg_dtendTime;

      fields.startDate = formatInputDate(arg_dstartDate, startTime);
      fields.endDate =	formatInputDate(arg_dtendDate, endTime);

        fields.alarms = [];
        fields.alarms.push(
        {
            action: arg_action,
            trigger: arg_trigger
        });
        return fields;
    }
	function ParseICSDate(icsDate, type){
		 //type : time/date

		var year=0;
		var month=0;
		var day=0;
		var hour=0;
		var mins=0;
		var sec=0;

		//date building YYYY-MM-DD
		if(type=='date'){
		var year=icsDate.substring(0,4);
		var month=icsDate.substring(4,6);
		var day=icsDate.substring(6,8);

		var icsDate = year+"-"+month+"-"+day;

		//time building hh:mm:ss Dont forget the "T" char in the middle
		}else{

		var hour=icsDate.substring(9,11);
		var mins=icsDate.substring(11,13);
		var sec=icsDate.substring(13,15);

		var icsDate = hour+":"+mins+":"+sec;

		}
			return icsDate;
	}

		  function formatInputDate(date, time)
	{
		var new_date = date.split("-");
		var new_hour = time.split(":");
		return new Date(new_date[0], new_date[1], new_date[2], new_hour[0], new_hour[1], new_hour[2]);
	}
  }

  }

  /**
   * The fields on our event model which urlparams may override.
   * @enum {string}
   */
  ModifyEvent.OverrideableField = {
    CALENDAR_ID: 'calendarId',
    DESCRIPTION: 'description',
    END_DATE: 'endDate',
    IS_ALL_DAY: 'isAllDay',
    LOCATION: 'location',
    START_DATE: 'startDate',
    TITLE: 'title'
  };

  return ModifyEvent;

}());
