Broken Hosts App for Splunk
===========================

The Broken Hosts App for Splunk is a useful tool for monitoring data going into Splunk. It has the
ability to alert when hosts stop sending data into Splunk, as well as inspect the last time the
final combination of data was received by Splunk.

If the arrival of the final log for the index/sourcetype/host combination is later than expected,
the Broken Hosts App will send an alert. This allows for quick status detection of the hosts and
fast issue resolution.

The Broken Hosts App for Splunk is the app for monitoring missing data in Splunk. The app’s three
main objectives include:

1. Alerting when data is missing from Splunk in order to determine the cause.
2. Utilizing saved searches to facilitate rapid detection of the missing data.
3. Creating dashboards for visualization to help with further investigations.

Features
--------

- Detects gaps in data being collected into Splunk
- Detects unexpected latency in data being collected into Splunk
- Generates statistics about data being collected into Splunk for other uses
- Includes dashboards for investigating broken data sources
- Use Splunk modular alert actions for sending alerts
- Lookup- and Eventtype-based configuration

Quickstart
----------

.. __: https://splunkbase.splunk.com/app/3247/

If you're an existing Broken Hosts user, please be sure to review our :ref:`upgrading`
documentation.

1. Install the `Broken Hosts App for Splunk`__ on your ad-hoc search head.
2. Use the ``Broken Hosts`` dashboard to determine appropriate baselines for all of your critical
   data.
3. Use the ``Configure Broken Hosts Lookup`` dashboard to configure your baselines and create
   suppressions.
4. Configure alert actions on the ``Broken Hosts Alert Search`` saved search in the Broken Hosts
   App for Splunk.
5. Enable the ``Broken Hosts Alert Search`` saved search in the Broken Hosts App for Splunk.

Known Issues
------------

- Future hosts in the ``Broken Hosts Alert Search`` may not match the future hosts displayed on the
  ``Broken Hosts`` dashboard. Future host detection will be moved to a separate search in a
  future release of the Broken Hosts App.
- search-time renaming of sourcetypes is not taken into account
- "Configure Broken Hosts Lookup" doesn't handle additional fields added to expectedTime lookup

Documentation
-------------

.. toctree::
   :maxdepth: 2

   usage/index
   architecture/index

Changelog
---------

Version 4.0.4 (RELEASE PENDING)
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

- updated bh_stats_gen search to fix a bug that might cause false positives
- set eventtypes to be local to the app instead of global

Version 4.0.3 (2018-12-11)
~~~~~~~~~~~~~~~~~~~~~~~~~~

- updated AutoSort to allow for arbitrary fields
- update investigation panel to have a more useful graph
- fixed type in app.conf that was preventing successful vetting

Version 4.0.2 (2018-11-14)
~~~~~~~~~~~~~~~~~~~~~~~~~~

- Revamped architecture

  - Decouple stats generation from alert generation
  - Eventtype-based aggregations and suppressions

- Additional investigation dashboards
- KV Store auto-sort functionality (enabled by default) to prevent false positive matches
- Fixed an issue when using Chrome v70 that caused loss of data in the ``expectedTime`` lookup

Version 3.3.6 (2018-03-18)
~~~~~~~~~~~~~~~~~~~~~~~~~~

- Row reordering feature added to 'Configure Broken Hosts Lookup' page. Can drag rows using the
  'Comments' column.
- 'Add New Suppression' button added to top right to make more visible.
- Ability to Copy formatted row data to clipboard
- Added expectedTime_tmp for backup purposes.

  - In edge cases where KV Store is being updated after a row-reorder on Configure page and user
    refreshes, KV Store data could be lost. For this reason, every change made backs up the current
    version to a expectedTime_tmp KV Store first
  - On initial load of the table it will check if expectedTime is empty, if it is it will then
    check expectedTime_tmp for data and use that as a backup in case the KV Store was emptied. If
    both are empty then it is assumed this is a new install and the user has an option to add
    default values to the KV Store.

Version 3.3.5 (2018-01-04)
~~~~~~~~~~~~~~~~~~~~~~~~~~

- updated the savedsearch to account for sourcetype rewrites

Version 3.3.4 (2017-12-13)
~~~~~~~~~~~~~~~~~~~~~~~~~~

- Removed unnecessary inputs.conf

Version 3.3.3 (2017-12-12)
~~~~~~~~~~~~~~~~~~~~~~~~~~

- The expectedTime lookup definition now references a KV Store instead of a lookup file
- Removed bin/ directory - Python script for generating lookup is no longer needed
- Removed lookups directory as it is now using a KV Store [expectedTime]
- lateSecs field now accepts Splunk's relative time format e.g. -1d@d OR 0 for 'Always Suppress'
- New dashboard: "Configure Broken Hosts Lookup" allows for CRUDing expectedTime KV Store

  - Applies validation to help ensure proper values are added into the lookup
  - Table highlights when two conditions are met:

    - If lateSecs is set to 'Always Suppress' and but a suppressUntil date has been provided.
    - If suppressUntil has a date that is in the past.

- New alert: "Broken Hosts – Suppress Until Is Set Past Date"

  - Runs nightly at 12:01am to check if any suppressUntil values are in the past
  - Alerts pre-defined contact

Version 3.3.2 (2017-08-29)
~~~~~~~~~~~~~~~~~~~~~~~~~~

- fixed a bug where the the broken hosts dashboard would show the wrong value for "Time Since
  Last Event"
- updated the app to work if the app directory is renamed
- updated the order of fields in the broken hosts dashboard
- reordered default expectedTime lookup table to be alphabetical
- added "cim_modactions" index to the default suppressions
- added cisco:ios default suppression
- added pan_config and pan:config default suppressions

Version 3.3.1 (2017-06-12)
~~~~~~~~~~~~~~~~~~~~~~~~~~

- bug fixes for splunk certification
- scale icon sizes down to splunk approved sizes

Version 3.3.0 (2017-06-02)
~~~~~~~~~~~~~~~~~~~~~~~~~~

- updated savedsearch to include any hosts that are sending logs from the future
- added the ability to add custom search additions to make the search more flexible
- added dashboard panel to show suppressed items
- updated dashboard panels to show currently broken items, and all items from the future
- added sparkline to the dashboard panels

Version 3.2.1 (2016-11-14)
~~~~~~~~~~~~~~~~~~~~~~~~~~

- updated suppression so that alerts are triggered properly
- added a link to 'setup' in the nav menu

Version 3.2.0 (2016-11-14)
~~~~~~~~~~~~~~~~~~~~~~~~~~

- modified the savedsearch to use 'tstats' instead of 'metadata' to allow use of sourcetype for tuning
- updated the savedsearch schedule to run every 30 minutes (because tstats takes longer than metadata)
- updated the savedsearch suppression to suppress for 2 hours instead of 1
- updated the savedsearch suppression to include sourcetype
- updated expectedTime lookup table to add a 'sourcetype' column
- updated first_time script to add 'sourcetype' column to lookup table
- added Broken Hosts dashboard
- updated documentation to include Broken Hosts dashboard information
- added app nav color

Version 3.1.1 (2016-08-09)
~~~~~~~~~~~~~~~~~~~~~~~~~~

- added script to automatically create the lookup if it doens't already exist
- expanded readme information

Version 3.1.0 (2016-06-29)
~~~~~~~~~~~~~~~~~~~~~~~~~~

- Added setup page with default contact and default allowable lateness

Version 3.0.0 (2016-06-24)
~~~~~~~~~~~~~~~~~~~~~~~~~~

- Another major rewrite
- Added the ability to suppress an item
- Added the ability to send different items to different contacts

Version 2.2.1 (2016-04-14)
~~~~~~~~~~~~~~~~~~~~~~~~~~

- force host to lowercase for comparisons

Version 2.2 (2016-04-14)
~~~~~~~~~~~~~~~~~~~~~~~~

- fixed issue with the index exclusions in the search
- reversed the order of the release notes, putting new version at the top

Version 2.1 (2016-01-05)
~~~~~~~~~~~~~~~~~~~~~~~~

- wildcard in lookup table instead of empty quoted string
- app is visible (to allow the "run" button on the saved search to work)
- initial lookup table is now named with .sample extention to not over-write any previous tuning

Version 2.0 (2015-10-20)
~~~~~~~~~~~~~~~~~~~~~~~~

- complete re-write of the app from scratch
- uses dbinspect and metadata commands to make this search much faster
- uses a lookup table to make tuning a breeze

License
-------

.. highlight:: none
.. include:: LICENSE
   :literal:
