/* eslint-disable camelcase */
/* eslint-disable no-param-reassign, no-console */

const cloneDeep = require('lodash/cloneDeep');
const { camelize } = require('../../../utilities/stringHelpers');

const {
  LOVELL_TITLE_STRING,
  LOVELL_MENU_KEY,
  LOVELL_VA_LINK_VARIATION,
  LOVELL_TRICARE_LINK_VARIATION,
  LOVELL_BASE_URL,
  isLovellFederalPage,
  isLovellTricarePage,
  isLovellVaPage,
  isListingPage,
  isFederalRegionHomepage,
  getLovellTitle,
  getLovellTitleVariation,
  getLovellVariantOfUrl,
  getLovellUrl,
} = require('./lovell/helpers');

const {
  getLovellPageVariables,
  getLovellVariantPath,
  getLovellCanonicalLink,
  getLovellSwitchPath,
  getLovellBreadcrumbs,
  getLovellVariantTitle,
} = require('./lovell/update-page');

function getModifiedLovellPage(page, variant) {
  const pageVars = getLovellPageVariables(page, variant);

  page.title = getLovellVariantTitle(page.title, pageVars);
  page.entityUrl.path = getLovellVariantPath(pageVars);
  page.entityUrl.switchPath = getLovellSwitchPath(pageVars);

  if (variant === 'tricare' && isLovellFederalPage(page)) {
    page.canonicalLink = getLovellCanonicalLink(pageVars);
  }

  if (page.entityUrl.breadcrumb) {
    page.entityUrl.breadcrumb = getLovellBreadcrumbs(pageVars);
  }

  if (page.fieldRegionPage) {
    page.fieldRegionPage.entity.title = getLovellTitle(
      getLovellTitleVariation(pageVars.variant),
    );
  }

  if (page?.fieldOffice?.entity) {
    page.fieldOffice.entity = {
      ...page.fieldOffice.entity,
      entityLabel: getLovellTitle(getLovellTitleVariation(pageVars.variant)),
      entityUrl: {
        ...page.fieldOffice.entity?.entityUrl,
        path: getLovellUrl(pageVars.linkVar),
      },
    };
  }

  if (page?.fieldListing?.entity?.entityUrl) {
    page.fieldListing.entity.entityUrl.path = getLovellVariantOfUrl(
      page.fieldListing.entity.entityUrl.path,
      variant,
    );
  }

  return page;
}

function lovellMenusModifyLinks(link) {
  const { variant } = this;
  const titleVar = getLovellTitleVariation(variant);
  const linkVar =
    variant === 'va' ? LOVELL_VA_LINK_VARIATION : LOVELL_TRICARE_LINK_VARIATION;

  // Only modify the links that are in both sections
  if (link.entity.fieldMenuSection === 'both') {
    link.label = link.label.replace(
      LOVELL_TITLE_STRING,
      getLovellTitle(titleVar),
    );

    link.url.path = getLovellVariantOfUrl(link.url.path, linkVar);
  }

  // Use recursion to modify nested links
  if (link && link.links.length > 0) {
    // Remove the links that don't belong in this version of the menu
    // If it's tricare va links
    // If it's va tricare links
    link.links = link.links.filter(menuItem => {
      if (menuItem.entity.fieldMenuSection === 'va' && variant === 'tricare') {
        return false;
      }
      if (menuItem.entity.fieldMenuSection === 'tricare' && variant === 'va') {
        return false;
      }
      return true;
    });
    link.links.map(lovellMenusModifyLinks, { variant });
  }

  return link;
}

function getLovellCloneMenu(drupalData, lovellMenuKey, variant) {
  const titleVar = getLovellTitleVariation(variant);
  // Clone the original menu
  const lovellCloneMenu = cloneDeep(drupalData.data[lovellMenuKey]);

  // Rename the name so our new cloned pages can find the cloned menu
  lovellCloneMenu.name = getLovellTitle(titleVar);

  // Move federal health care links to the top of the menu
  // Otherwise the menu renders as blank
  const federalLinksIndex = lovellCloneMenu.links
    .map(menu => menu.label)
    .indexOf('Lovell Federal health care');
  const federalLinks = lovellCloneMenu.links.splice(federalLinksIndex, 1);
  lovellCloneMenu.links = [...federalLinks, ...lovellCloneMenu.links];

  // Change the root level item
  // It's coming in from the cms as a va item when it should be both
  lovellCloneMenu.links[0].label = 'Lovell Federal Health Care';
  lovellCloneMenu.links[0].url.path = LOVELL_BASE_URL;
  lovellCloneMenu.links[0].entity.fieldMenuSection = 'both';

  // Use recursion to Filter and Modify labels and paths of those links
  lovellCloneMenu.links = lovellCloneMenu.links.map(lovellMenusModifyLinks, {
    variant,
  });

  // create a key for the new menus
  const lovellCloneMenuKey = camelize(
    `va${lovellCloneMenu.name}FacilitySidebarQuery`,
  );

  return {
    [lovellCloneMenuKey]: lovellCloneMenu,
  };
}

function updateLovellSwitchLinks(page, pages) {
  const allSwitchPaths = pages.map(
    switchPage => switchPage.entityUrl.switchPath,
  );
  const currentSwitchPath = page.entityUrl.switchPath;
  const isTricarePage = currentSwitchPath.includes(
    LOVELL_TRICARE_LINK_VARIATION,
  );
  const switchPathVariant = isTricarePage
    ? LOVELL_TRICARE_LINK_VARIATION
    : LOVELL_VA_LINK_VARIATION;
  const expectedPathVariant = isTricarePage
    ? LOVELL_VA_LINK_VARIATION
    : LOVELL_TRICARE_LINK_VARIATION;
  const expectedSwitchPath = currentSwitchPath.replace(
    switchPathVariant,
    expectedPathVariant,
  );

  if (!allSwitchPaths.includes(expectedSwitchPath)) {
    page.entityUrl.switchPath = false;
  }

  return page;
}

/**
 * For each listing page in tricareOrVaPages, finds the first occurrence of that listing page type in
 * federalPages and injects pastEvents and reverseFieldListingNode from that entity into
 * corresponding properties on the listing page from tricareOrVaPages.
 *
 * @param {*} tricareOrVaPages Listing pages that will have pastEvents and reverseFieldListingNode properties merged from federalPages
 * @param {*} federalPages Listing pages to merge into tricareOrVaPages
 * @returns
 */
function combineLovellListingPages(tricareOrVaPages, federalPages, variant) {
  return tricareOrVaPages.map(listingPage => {
    const typePastMap = {
      event_listing: 'pastEvents',
      press_releases_listing: 'pastPressReleases',
      story_listing: 'pastNewsStories',
    };
    const pastObjectLabel = typePastMap[listingPage.entityBundle];
    const {
      entityBundle,
      [pastObjectLabel]: pastListItems,
      reverseFieldListingNode,
    } = listingPage;

    const listingPageToCombine = federalPages.find(
      page => page.entityBundle === entityBundle,
    );

    const updateEntityUrlForVariant = entity => {
      return {
        ...entity,
        entityUrl: {
          ...entity.entityUrl,
          path: getLovellVariantOfUrl(entity.entityUrl.path, variant),
        },
      };
    };

    const {
      [pastObjectLabel]: pastListItemsToCombine,
      reverseFieldListingNode: reverseFieldListingNodeToCombine,
    } = listingPageToCombine;

    const pastListItemEntities = pastListItems?.entities || [];
    const allListItemEntities = reverseFieldListingNode?.entities || [];

    const pastListItemEntitiesToCombine =
      pastListItemsToCombine?.entities.map(updateEntityUrlForVariant) || [];
    const allListItemEntitiesToCombine =
      reverseFieldListingNodeToCombine?.entities.map(
        updateEntityUrlForVariant,
      ) || [];

    const combinedPastListItemEntities = [
      ...pastListItemEntities,
      ...pastListItemEntitiesToCombine,
    ];
    const combinedAllListItemEntities = [
      ...allListItemEntities,
      ...allListItemEntitiesToCombine,
    ];

    return {
      ...listingPage,
      reverseFieldListingNode: {
        ...reverseFieldListingNode,
        entities: combinedAllListItemEntities,
      },
      [pastObjectLabel]: {
        ...pastListItems,
        entities: combinedPastListItemEntities,
      },
    };
  });
}

function processLovellPages(drupalData) {
  // Note: this `reduce()` function allows us to categorize all the pages with a single pass over the array.
  // We could accomplish this same outcome with a few `filter()` calls, but that would require multiple passes over the array.
  const {
    lovellFederalListingPages,
    lovellFederalNonListingPages,
    lovellVaListingPages,
    lovellVaNonListingPages,
    lovellTricareListingPages,
    lovellTricareNonListingPages,
    otherPages,
  } = drupalData.data.nodeQuery.entities.reduce(
    (acc, page) => {
      if (isLovellFederalPage(page)) {
        // Federal Region Homepage should not be cloned
        if (isFederalRegionHomepage(page)) {
          return acc;
        }

        if (isListingPage(page)) {
          acc.lovellFederalListingPages.push(page);
        } else {
          acc.lovellFederalNonListingPages.push(page);
        }
      } else if (isLovellTricarePage(page)) {
        if (isListingPage(page)) {
          acc.lovellTricareListingPages.push(page);
        } else {
          acc.lovellTricareNonListingPages.push(page);
        }
      } else if (isLovellVaPage(page)) {
        if (isListingPage(page)) {
          acc.lovellVaListingPages.push(page);
        } else {
          acc.lovellVaNonListingPages.push(page);
        }
      } else {
        acc.otherPages.push(page);
      }

      return acc;
    },
    {
      lovellFederalListingPages: [],
      lovellFederalNonListingPages: [],
      lovellTricareListingPages: [],
      lovellTricareNonListingPages: [],
      lovellVaListingPages: [],
      lovellVaNonListingPages: [],
      otherPages: [],
    },
  );

  const lovellTricareListingPagesWithFederal = combineLovellListingPages(
    lovellTricareListingPages,
    lovellFederalListingPages,
    'tricare',
  );
  const lovellVaListingPagesWithFederal = combineLovellListingPages(
    lovellVaListingPages,
    lovellFederalListingPages,
    'va',
  );

  // modify all tricare pages
  const lovellTricarePages = [
    ...lovellTricareListingPagesWithFederal,
    ...lovellTricareNonListingPages,
  ];
  const modifiedLovellTricarePages = lovellTricarePages.map(page =>
    getModifiedLovellPage(page, 'tricare'),
  );
  // modify all va pages
  const lovellVaPages = [
    ...lovellVaListingPagesWithFederal,
    ...lovellVaNonListingPages,
  ];
  const modifiedLovellVaPages = lovellVaPages.map(page =>
    getModifiedLovellPage(page, 'va'),
  );
  // Each federal page needs to be duplicated and modified once each for tricare/va
  const lovellFederalPagesClonedTricare = lovellFederalNonListingPages.map(
    page => getModifiedLovellPage(cloneDeep(page), 'tricare'),
  );
  const lovellFederalPagesClonedVa = lovellFederalNonListingPages.map(page =>
    getModifiedLovellPage(cloneDeep(page), 'va'),
  );

  const processedLovellPages = [
    ...modifiedLovellTricarePages,
    ...modifiedLovellVaPages,
    ...lovellFederalPagesClonedTricare,
    ...lovellFederalPagesClonedVa,
  ].map((page, index, pages) => updateLovellSwitchLinks(page, pages));

  drupalData.data.nodeQuery.entities = [...processedLovellPages, ...otherPages];

  // Clone and modify the menu
  drupalData.data = {
    ...drupalData.data,
    ...getLovellCloneMenu(drupalData, LOVELL_MENU_KEY, 'va'),
    ...getLovellCloneMenu(drupalData, LOVELL_MENU_KEY, 'tricare'),
  };
  // Remove the original menu
  delete drupalData.data[LOVELL_MENU_KEY];
}

module.exports = {
  isLovellTricarePage,
  isLovellVaPage,
  processLovellPages,
};
