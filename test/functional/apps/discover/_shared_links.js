
import expect from 'expect.js';

import {
  bdd,
  scenarioManager,
  esClient,
  elasticDump
} from '../../../support';

import PageObjects from '../../../support/page_objects';

bdd.describe('shared links', function describeIndexTests() {
  let baseUrl;
  // The message changes for Firefox < 41 and Firefox >= 41
  // var expectedToastMessage = 'Share search: URL selected. Press Ctrl+C to copy.';
  // var expectedToastMessage = 'Share search: URL copied to clipboard.';
  // Pass either one.
  const expectedToastMessage = /Share search: URL (selected\. Press Ctrl\+C to copy\.|copied to clipboard\.)/;

  bdd.before(function () {
    baseUrl = PageObjects.common.getHostPort();
    PageObjects.common.debug('baseUrl = ' + baseUrl);
    // browsers don't show the ':port' if it's 80 or 443 so we have to
    // remove that part so we can get a match in the tests.
    baseUrl = baseUrl.replace(':80','').replace(':443','');
    PageObjects.common.debug('New baseUrl = ' + baseUrl);

    const fromTime = '2015-09-19 06:31:44.000';
    const toTime = '2015-09-23 18:31:44.000';

    // delete .kibana index and update configDoc
    return esClient.deleteAndUpdateConfigDoc({'dateFormat:tz':'UTC', 'defaultIndex':'logstash-*'})
    .then(function loadkibanaIndexPattern() {
      PageObjects.common.debug('load kibana index with default index pattern');
      return elasticDump.elasticLoad('visualize','.kibana');
    })
    // and load a set of makelogs data
    .then(function loadIfEmptyMakelogs() {
      return scenarioManager.loadIfEmpty('logstashFunctional');
    })

    // siren: disable the hashed urls which we turned on by default
    .then(function () {
      return PageObjects.settings.navigateTo();
    })
    .then(function () {
      return PageObjects.settings.clickKibanaSettings();
    })
    .then(function () {
      PageObjects.common.debug('disable the hashed urls');
      return PageObjects.settings.setAdvancedSettings('state:storeInSessionStorage', false);
    })
    .then(function GetAdvancedSetting() {
      PageObjects.common.debug('check that hashed urls are disabled');
      return PageObjects.settings.getAdvancedSettings('state:storeInSessionStorage');
    })
    .then(function (advancedSetting) {
      expect(advancedSetting).to.be('false');
    })
    //kibi: end

    .then(function () {
      PageObjects.common.debug('discover');
      return PageObjects.common.navigateToApp('discover');
    })
    .then(function () {
      PageObjects.common.debug('setAbsoluteRange');
      return PageObjects.header.setAbsoluteRange(fromTime, toTime);
    })
    .then(function () {
      //After hiding the time picker, we need to wait for
      //the refresh button to hide before clicking the share button
      return PageObjects.common.sleep(1000);
    });
  });


  bdd.describe('shared link', function () {
    bdd.it('should show "Share a link" caption', function () {
      const expectedCaption = 'Share saved';
      return PageObjects.discover.clickShare()
      .then(function () {
        PageObjects.common.saveScreenshot('Discover-share-link');
        return PageObjects.discover.getShareCaption();
      })
      .then(function (actualCaption) {
        expect(actualCaption).to.contain(expectedCaption);
      });
    });

    bdd.it('should show the correct formatted URL', function () {
      // kibi: added empty kibistate to the URL
      const expectedUrl = baseUrl
        + '/app/kibana?_t=1453775307251#'
        + '/discover?_g=(refreshInterval:(display:Off,pause:!f,value:0),time'
        + ':(from:\'2015-09-19T06:31:44.000Z\',mode:absolute,to:\'2015-09'
        + '-23T18:31:44.000Z\'))&_k=()&_a=(columns:!(_source),index:\'logstash-'
        + '*\',interval:auto,query:(query_string:(analyze_wildcard:!t,query'
        + ':\'*\')),sort:!(\'@timestamp\',desc))';
      return PageObjects.discover.getSharedUrl()
      .then(function (actualUrl) {
        // strip the timestamp out of each URL
        expect(actualUrl.replace(/_t=\d{13}/,'_t=TIMESTAMP'))
          .to.be(expectedUrl.replace(/_t=\d{13}/,'_t=TIMESTAMP'));
      });
    });

    bdd.it('should show toast message for copy to clipboard', function () {
      return PageObjects.discover.clickCopyToClipboard()
      .then(function () {
        return PageObjects.header.getToastMessage();
      })
      .then(function (toastMessage) {
        PageObjects.common.saveScreenshot('Discover-copy-to-clipboard-toast');
        expect(toastMessage).to.match(expectedToastMessage);
      })
      .then(function () {
        return PageObjects.header.waitForToastMessageGone();
      });
    });

    // siren:
    // removed test "shorten URL button should produce a short URL"
    // as we removed the button

    // NOTE: This test has to run immediately after the test above
    bdd.it('should show toast message for copy to clipboard', function () {
      return PageObjects.discover.clickCopyToClipboard()
      .then(function () {
        return PageObjects.header.getToastMessage();
      })
      .then(function (toastMessage) {
        expect(toastMessage).to.match(expectedToastMessage);
      })
      .then(function () {
        return PageObjects.header.waitForToastMessageGone();
      });
    });
  });
});
