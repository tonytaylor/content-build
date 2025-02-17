const {
  query: queryVamcEhrSystem,
  postProcess: postProcessVamcEhrSystem,
} = require('./vamcEhrSystem');

const {
  query: queryVamcFacilitySupplementalStatus,
  postProcess: postProcessVamcFacilitySupplementalStatus,
} = require('./vamcFacilitySupplementalStatus');

const DATA_FILE_PATH = 'data/cms';

/**
 * {
 *    description: String used in build log,
 *    filename: File will be generated at `${DATA_FILE_PATH}/${filename}`,
 *    queryType: 'graphql' (default); aim to eventually support jsonapi
 *    query: String defining the query to be run,
 *    postProcess: Callback function to apply post-query processing on query result,
 * }
 */
const DATA_FILES = [
  {
    description: 'VAMC EHR System',
    filename: 'vamc-ehr.json',
    query: queryVamcEhrSystem,
    postProcess: postProcessVamcEhrSystem,
  },
  {
    description: 'VAMC Facility Supplemental Status',
    filename: 'vamc-facility-supplemental-status.json',
    query: queryVamcFacilitySupplementalStatus,
    postProcess: postProcessVamcFacilitySupplementalStatus,
  },
];

module.exports = {
  DATA_FILE_PATH,
  DATA_FILES,
};
