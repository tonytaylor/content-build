/**
 * Home page
 */

const menu = 'homepage-top-tasks-blocks';
const hubListQueue = 'home_page_hub_list';
const hubListMenu = 'home-page-hub-list';
const hubListCreateAccountQueue = 'v2_home_page_create_account';
const promoBlocksQueue = 'home_page_promos';
const homePageHeroQueue = 'home_page_hero';
const homePageNewsSpotlightQueue = 'home_page_news_spotlight';
const homePagePopularLinksMenu = 'popular-on-va-gov';
const otherSearchToolsMenu = 'other-search-tools';

const linksQueryPartial = `
  name
  links {
    label
    url {
      path
    }
  }
`;
const query = `
  homePageMenuQuery:menuByName(name: "${menu}") {
    name
    links {
      label
      url {
        path
      }
      links {
        label
        url {
          path
        }
      }
    }
  }
  homePageHubListQuery: entitySubqueueById(id: "${hubListQueue}") {
    ... on EntitySubqueueHomePageHubList {
      itemsOfEntitySubqueueHomePageHubList {
        entity {
          ... on NodeLandingPage {
            entityId
            entityLabel
            fieldTeaserText
            fieldTitleIcon
            fieldHomePageHubLabel
            entityUrl {
              path
              routed
            }
          }
        }
      }
    }
  }
  homePageHubListMenuQuery:menuByName(name: "${hubListMenu}") {
    name
    description
    links {
      ... on MenuLink {
        enabled
        label
        url {
          path
        }
        entity {
          parent
          ... on MenuLinkContentHomePageHubList {
            fieldIcon
            fieldLinkSummary
            linkedEntity(language_fallback: true, bypass_access_check: true) {
              ... on Node {
                entityPublished
                moderationState
              }
            }
          }
        }
      }
    }
  }
  homePagePromoBlockQuery: entitySubqueueById(id: "${promoBlocksQueue}") {
    ... on EntitySubqueueHomePagePromos {
      itemsOfEntitySubqueueHomePagePromos {
         entity {
          ... on BlockContentPromo {
            entityId
            entityLabel
            fieldImage {
              targetId
              entity {
                ...on MediaImage {
                  image {
                    url
                    alt
                  }
                }

              }
            }
            fieldPromoLink {
              targetId
              ...on FieldBlockContentPromoFieldPromoLink {
                entity {
                  ... on ParagraphLinkTeaser {
                    fieldLink {
                      uri
                      title
                      options
                    }
                    fieldLinkSummary
                  }
                }
              }
            }
          }
        }
      }
    }
  }
  homePageHeroQuery: entitySubqueueById(id: "${homePageHeroQueue}") {
    ... on EntitySubqueueHomePageHero {
      itemsOfEntitySubqueueHomePageHero {
        entity {
          ... on BlockContentBenefitPromo {
            entityId
            entityLabel
            fieldPromoHeadline
            fieldPromoText
            fieldPromoCta {
              entity {
                ... on ParagraphButton {
                  fieldButtonLink {
                    url {
                      path
                    }
                  }
                  fieldButtonLabel
                }
              }
            }
          }
        }
      }
    }
  }
  homePageNewsSpotlightQuery: entitySubqueueById(id: "${homePageNewsSpotlightQueue}") {
    ... on EntitySubqueueHomePageNewsSpotlight {
      itemsOfEntitySubqueueHomePageNewsSpotlight {
        entity {
          ... on BlockContentNewsPromo {
            entityId
            entityLabel
            fieldPromoHeadline
            fieldPromoText
            fieldLink {
              url {
                path
              }
            }
            fieldLinkLabel
            fieldImage {
              entity {
                ... on MediaImage {
                  image {
                    alt
                    derivative(style: LARGE) {
                      url
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
  homePagePopularOnVaGovMenuQuery:  menuByName(name: "${homePagePopularLinksMenu}") {
    ${linksQueryPartial}
  }
  homePageOtherSearchToolsMenuQuery:  menuByName(name: "${otherSearchToolsMenu}") {
    ${linksQueryPartial}
  }
  homePageCreateAccountQuery: entitySubqueueById(id: "${hubListCreateAccountQueue}") {
    ... on EntitySubqueueV2HomePageCreateAccount {
      itemsOfEntitySubqueueV2HomePageCreateAccount {
        entity {
          entityId
          ... on BlockContentCtaWithLink {
            entityId
            entityLabel
            fieldCtaSummaryText
            fieldPrimaryCtaButtonText
            fieldRelatedInfoLinks {
              title
              url {
                path
              }
            }
          }
        }
      }
    }
  }
`;

const GetHomepage = `
  query {
    ${query}
  }
`;

module.exports = {
  partialQuery: query,
  GetHomepage,
};
