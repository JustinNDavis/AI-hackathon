import { LightningElement } from 'lwc';
import alloySubmit from '@salesforce/apex/DAO_MockAlloyService.submitVerification';
import alloyPoll from '@salesforce/apex/DAO_MockAlloyService.pollStatus';
import chexRun from '@salesforce/apex/DAO_MockChexService.runInquiry';
import plaidLink from '@salesforce/apex/DAO_MockPlaidService.createLinkSession';
import plaidComplete from '@salesforce/apex/DAO_MockPlaidService.completeFunding';

/** Minimum time the KYC loader is shown (mock “network” delay). */
const ALLOY_DELAY_MS = 3000;

/** Scenarios rotate randomly so demo / UAT can surface each UI path. */
const ALLOY_SCENARIOS = [
    'approved_clean',
    'approved_notations',
    'review_manual',
    'review_data_request',
    'review_sanctions',
    'declined',
    'error'
];

const SCENARIO_SET = new Set(ALLOY_SCENARIOS);

function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function randomToken(prefix) {
    const a = Math.random().toString(36).slice(2, 10);
    const b = Math.random().toString(36).slice(2, 6);
    return `${prefix}-${(a + b).toUpperCase()}`;
}

function unixNowSeconds() {
    return Math.floor(Date.now() / 1000);
}

function pickScenario() {
    return ALLOY_SCENARIOS[Math.floor(Math.random() * ALLOY_SCENARIOS.length)];
}

/**
 * Collect outcome_reasons from entity_applications and terminal reconciliation (Alloy GET journey application shape).
 * @param {Record<string, unknown>} alloyJourney
 * @returns {string[]}
 */
function extractAlloyOutcomeReasons(alloyJourney) {
    const out = [];
    const seen = new Set();
    const push = (arr) => {
        if (!Array.isArray(arr)) {
            return;
        }
        for (const r of arr) {
            const s = r != null ? String(r) : '';
            if (s && !seen.has(s)) {
                seen.add(s);
                out.push(s);
            }
        }
    };
    const apps = alloyJourney?._embedded?.entity_applications;
    if (Array.isArray(apps)) {
        for (const ea of apps) {
            push(ea.outcome_reasons);
        }
    }
    push(alloyJourney?.terminal_reconciliation_output?.outcome_reasons);
    return out;
}

/**
 * Shape modeled on Alloy Journey "GET journey application" + webhook fields
 * (see https://developer.alloy.com/public/docs/integration — status, complete_outcome, journey_application_status, _embedded).
 * @param {Record<string, unknown>} personEcho
 * @param {string} scenario
 */
function buildAlloyJourneyApplication(personEcho, scenario) {
    const journeyToken = randomToken('J');
    const journeyApplicationToken = randomToken('JA');
    const caseToken = randomToken('C');
    const evaluationToken = randomToken('EV');
    const baseHref = `https://sandbox.alloy.co/v1/journeys/${journeyToken}/applications/${journeyApplicationToken}`;

    const base = {
        journey_application_token: journeyApplicationToken,
        journey_token: journeyToken,
        sandbox: true,
        created_at: unixNowSeconds() - 180,
        updated_at: unixNowSeconds(),
        is_archived: false,
        is_shadow_app: false,
        external_application_id: personEcho?.customerLookup?.accountId
            ? String(personEcho.customerLookup.accountId)
            : personEcho?.applicantEntityType === 'Business'
              ? 'DAO-BIZ-' + randomToken('X')
              : randomToken('DAO'),
        _links: {
            self: { href: baseHref },
            journey_application: { href: baseHref }
        },
        _embedded: {
            /** Mirrors webhook / evaluation event style payloads */
            events: []
        }
    };

    switch (scenario) {
        case 'approved_clean': {
            return {
                ...base,
                status: 'completed',
                complete_outcome: 'Approved',
                journey_application_status: 'Approved',
                recent_outcome: null,
                terminal_reconciliation_output: {
                    outcome: 'Approved',
                    outcome_reasons: [],
                    journey_application_token: journeyApplicationToken
                },
                _embedded: {
                    ...base._embedded,
                    entity_applications: [
                        {
                            entity_token: randomToken('P'),
                            entity_application_token: randomToken('EA'),
                            entity_application_status: 'completed',
                            outcome: 'Approved',
                            outcome_reasons: [],
                            case_token: caseToken
                        }
                    ],
                    events: [
                        {
                            type: 'completed_evaluation',
                            timestamp: unixNowSeconds() - 60,
                            outcome: 'Approved',
                            evaluation_token: evaluationToken,
                            entity_token: randomToken('P'),
                            _links: {
                                evaluation: { href: `https://sandbox.alloy.co/v1/evaluations/${evaluationToken}` }
                            }
                        }
                    ]
                }
            };
        }
        case 'approved_notations': {
            const reasons = ['address_standardized', 'phone_carrier_match_high_confidence'];
            return {
                ...base,
                status: 'completed',
                complete_outcome: 'Approved',
                journey_application_status: 'Approved',
                terminal_reconciliation_output: {
                    outcome: 'Approved',
                    outcome_reasons: reasons,
                    journey_application_token: journeyApplicationToken
                },
                _embedded: {
                    ...base._embedded,
                    entity_applications: [
                        {
                            entity_token: randomToken('P'),
                            entity_application_token: randomToken('EA'),
                            entity_application_status: 'completed',
                            outcome: 'Approved',
                            outcome_reasons: reasons,
                            case_token: caseToken
                        }
                    ],
                    events: [
                        {
                            type: 'completed_branch',
                            timestamp: unixNowSeconds() - 45,
                            outcome: 'Approved',
                            entity_application_token: randomToken('EA'),
                            _embedded: {
                                node: {
                                    id: randomToken('N'),
                                    type: 'outcome',
                                    config: { outcome: 'Approved' }
                                }
                            }
                        }
                    ]
                }
            };
        }
        case 'review_manual': {
            return {
                ...base,
                status: 'waiting_review',
                complete_outcome: null,
                journey_application_status: 'Application Review',
                _embedded: {
                    ...base._embedded,
                    entity_applications: [
                        {
                            entity_token: randomToken('P'),
                            entity_application_token: randomToken('EA'),
                            entity_application_status: 'waiting_review',
                            outcome: null,
                            outcome_reasons: [
                                'manual_review_queue',
                                'policy_exception_review',
                                'pending_journey_application_review'
                            ],
                            case_token: caseToken
                        }
                    ],
                    events: [
                        {
                            type: 'started_review',
                            timestamp: unixNowSeconds() - 30,
                            case_token: caseToken,
                            entity_token: randomToken('P')
                        }
                    ]
                }
            };
        }
        case 'review_data_request': {
            return {
                ...base,
                status: 'data_request',
                complete_outcome: null,
                journey_application_status: 'Data Request',
                data_request: {
                    required: ['kba_step_up'],
                    optional: [],
                    message: 'Additional verification required to continue the journey.'
                },
                _embedded: {
                    ...base._embedded,
                    entity_applications: [
                        {
                            entity_token: randomToken('P'),
                            entity_application_token: randomToken('EA'),
                            entity_application_status: 'pending_action',
                            outcome: null,
                            outcome_reasons: ['data_request_evaluation', 'kba_step_up_required'],
                            case_token: caseToken
                        }
                    ],
                    events: [
                        {
                            type: 'data_request_evaluation',
                            timestamp: unixNowSeconds() - 20,
                            evaluation_token: evaluationToken,
                            _links: {
                                evaluation: { href: `https://sandbox.alloy.co/v1/evaluations/${evaluationToken}?fullData=true` }
                            }
                        }
                    ]
                }
            };
        }
        case 'review_sanctions': {
            return {
                ...base,
                status: 'pending_journey_application_review',
                complete_outcome: null,
                journey_application_status: 'Application Review',
                _embedded: {
                    ...base._embedded,
                    entity_applications: [
                        {
                            entity_token: randomToken('P'),
                            entity_application_token: randomToken('EA'),
                            entity_application_status: 'waiting_review',
                            outcome: null,
                            outcome_reasons: [
                                'sanctions_screening_possible_match',
                                'adverse_media_hit_low_severity',
                                'pending_journey_application_review'
                            ],
                            case_token: caseToken
                        }
                    ],
                    events: [
                        {
                            type: 'pending_review',
                            timestamp: unixNowSeconds() - 15,
                            case_token: caseToken
                        }
                    ]
                }
            };
        }
        case 'declined': {
            const reasons = ['score_below_approval_threshold', 'identity_verification_failed'];
            return {
                ...base,
                status: 'completed',
                complete_outcome: 'Denied',
                journey_application_status: 'Denied',
                terminal_reconciliation_output: {
                    outcome: 'Denied',
                    outcome_reasons: reasons,
                    journey_application_token: journeyApplicationToken
                },
                _embedded: {
                    ...base._embedded,
                    entity_applications: [
                        {
                            entity_token: randomToken('P'),
                            entity_application_token: randomToken('EA'),
                            entity_application_status: 'completed',
                            outcome: 'Denied',
                            outcome_reasons: reasons,
                            case_token: caseToken
                        }
                    ],
                    events: [
                        {
                            type: 'completed_application',
                            timestamp: unixNowSeconds() - 5,
                            outcome: 'Denied'
                        }
                    ]
                }
            };
        }
        case 'error':
        default: {
            return {
                ...base,
                status: 'error',
                complete_outcome: null,
                journey_application_status: 'Error',
                error: {
                    code: 'vendor_timeout',
                    message: 'Downstream identity vendor did not return a result within the allotted time.',
                    detail: 'Retry is safe; no decision was persisted for this journey application token.'
                },
                _embedded: {
                    ...base._embedded,
                    entity_applications: [],
                    events: [
                        {
                            type: 'error',
                            timestamp: unixNowSeconds(),
                            message: 'Evaluation service unavailable (mock).'
                        }
                    ]
                }
            };
        }
    }
}

function mapScenarioToWizardResult(scenario, alloyJourney, personEcho) {
    const rawData = {
        provider: 'alloy',
        mock: true,
        mockScenario: scenario,
        receivedAt: new Date().toISOString(),
        /** Echo of what would be POSTed to Alloy (person + journey context) */
        requestEcho: {
            customerLookup: personEcho?.customerLookup,
            needsAssessment: personEcho?.needsAssessment,
            partiesSummary: Array.isArray(personEcho?.parties)
                ? personEcho.parties.map((p) => ({ role: p.role, name: p.name || p.fullName }))
                : [],
            productIds: personEcho?.selectedProducts
        },
        /** Alloy GET /journeys/{journey_token}/applications/{journey_application_token} style body */
        alloyJourneyApplication: alloyJourney
    };

    /** Wizard `flags` mirror `_embedded.entity_applications[].outcome_reasons` (and terminal reasons when present). */
    const flagsFromJourney = () => {
        if (scenario === 'approved_notations') {
            /* Outcome reasons stay on alloyJourneyApplication only; keep approve UX without review chips */
            return [];
        }
        const extracted = extractAlloyOutcomeReasons(alloyJourney);
        if (scenario === 'error' && extracted.length === 0) {
            const code = alloyJourney?.error?.code;
            if (code) {
                extracted.push(String(code));
            }
        }
        return extracted;
    };

    switch (scenario) {
        case 'approved_clean':
            return {
                decision: 'approved',
                confidence: 94 + Math.floor(Math.random() * 5),
                flags: flagsFromJourney(),
                rawData
            };
        case 'approved_notations':
            return {
                decision: 'approved',
                confidence: 86 + Math.floor(Math.random() * 6),
                flags: flagsFromJourney(),
                rawData
            };
        case 'review_manual':
            return {
                decision: 'review',
                confidence: 58 + Math.floor(Math.random() * 8),
                flags: flagsFromJourney(),
                rawData
            };
        case 'review_data_request':
            return {
                decision: 'review',
                confidence: 52 + Math.floor(Math.random() * 10),
                flags: flagsFromJourney(),
                rawData
            };
        case 'review_sanctions':
            return {
                decision: 'review',
                confidence: 49 + Math.floor(Math.random() * 12),
                flags: flagsFromJourney(),
                rawData
            };
        case 'declined': {
            const reasons = [
                'Automated decision: identity could not be verified to institution standards.',
                'Model score fell below the published approval threshold for this product.'
            ];
            return {
                decision: 'declined',
                confidence: 28 + Math.floor(Math.random() * 15),
                flags: flagsFromJourney(),
                denialReasons: reasons,
                rawData
            };
        }
        case 'error':
        default:
            return {
                decision: 'error',
                confidence: null,
                flags: flagsFromJourney(),
                errorMessage:
                    alloyJourney?.error?.message ||
                    'Alloy journey application ended in error — no approval decision was recorded.',
                rawData
            };
    }
}

/** Unused default export — bundle exists for shared named exports to sibling DAO LWCs. */
export default class DaoMockApiService extends LightningElement {}

/**
 * Mock Alloy Journey API: waits, then returns wizard fields + realistic `rawData`.
 * @param {Record<string, unknown>} personData
 * @param {string} [forcedScenario] When set to a known scenario id, that path is used instead of random.
 * @returns {Promise<{ decision: string, confidence: number|null, flags: string[], rawData: Record<string, unknown>, errorMessage?: string, denialReasons?: string[] }>}
 */
export async function mockAlloyKYC(personData, forcedScenario) {
    await delay(ALLOY_DELAY_MS);
    const scenario =
        typeof forcedScenario === 'string' && SCENARIO_SET.has(forcedScenario) ? forcedScenario : pickScenario();
    const alloyJourney = buildAlloyJourneyApplication(personData || {}, scenario);
    return mapScenarioToWizardResult(scenario, alloyJourney, personData || {});
}

const CHEX_DELAY_MS = 1400;

/** @type {Set<string>} */
const CHEX_OUTCOME_SET = new Set(['clear', 'review', 'decline']);

function chexPayloadIsBusiness(personData) {
    if (!personData || typeof personData !== 'object') {
        return false;
    }
    if (personData.applicantEntityType === 'Business') {
        return true;
    }
    const ad = personData.customerLookup?.accountData;
    if (ad && ad.entityKind === 'BUSINESS') {
        return true;
    }
    return false;
}

/**
 * @param {string} raw
 * @returns {'clear'|'review'|'decline'|null}
 */
function normalizeChexForcedOutcome(raw) {
    if (typeof raw !== 'string') {
        return null;
    }
    const s = raw.toLowerCase();
    return CHEX_OUTCOME_SET.has(s) ? /** @type {'clear'|'review'|'decline'} */ (s) : null;
}

/**
 * Deterministic BizChex-style payload (commercial).
 * @param {'clear'|'review'|'decline'} outcome
 */
function buildBusinessChexOutcome(outcome) {
    if (outcome === 'decline') {
        return {
            inquiryType: 'business',
            score: 438,
            status: 'decline',
            history: [
                {
                    date: '2022-09-02',
                    institution: 'First Mercantile Bank',
                    code: 'COMM_DDA_CHARGE_OFF',
                    detail: 'Commercial demand deposit charged off — recovery in process'
                },
                {
                    date: '2021-04-18',
                    institution: 'Valley Business CU',
                    code: 'RETURNED_ITEM',
                    detail: 'Repeated returned commercial items within 60 days'
                }
            ]
        };
    }
    if (outcome === 'review') {
        return {
            inquiryType: 'business',
            score: 528,
            status: 'review',
            history: [
                {
                    date: '2023-11-05',
                    institution: 'Coastal Commerce Bank',
                    code: 'COMM_ACCOUNT_CLOSED',
                    detail: 'Commercial account closed — reason not reported'
                }
            ]
        };
    }
    return {
        inquiryType: 'business',
        score: 628,
        status: 'clear',
        history: []
    };
}

/**
 * Deterministic consumer ChexSystems-style payload.
 * @param {'clear'|'review'|'decline'} outcome
 */
function buildConsumerChexOutcome(outcome) {
    if (outcome === 'decline') {
        return {
            inquiryType: 'consumer',
            score: 418,
            status: 'decline',
            history: [
                {
                    date: '2022-04-12',
                    institution: 'Prior Community CU',
                    code: 'NSF',
                    detail: 'Multiple NSF occurrences within 90 days'
                },
                {
                    date: '2021-11-03',
                    institution: 'Regional Bank',
                    code: 'ACCOUNT_CLOSED',
                    detail: 'Account closed with unpaid negative balance'
                }
            ]
        };
    }
    if (outcome === 'review') {
        return {
            inquiryType: 'consumer',
            score: 512,
            status: 'review',
            history: [
                {
                    date: '2023-08-20',
                    institution: 'Neighborhood Bank',
                    code: 'ACCOUNT_CLOSED',
                    detail: 'Consumer closed account — reason not reported'
                }
            ]
        };
    }
    return {
        inquiryType: 'consumer',
        score: 598,
        status: 'clear',
        history: []
    };
}

function pickRandomBusinessChexOutcome() {
    const roll = Math.random();
    if (roll < 0.11) {
        return buildBusinessChexOutcome('decline');
    }
    if (roll < 0.34) {
        return buildBusinessChexOutcome('review');
    }
    return buildBusinessChexOutcome('clear');
}

function pickRandomConsumerChexOutcome() {
    const roll = Math.random();
    if (roll < 0.12) {
        return buildConsumerChexOutcome('decline');
    }
    if (roll < 0.35) {
        return buildConsumerChexOutcome('review');
    }
    return buildConsumerChexOutcome('clear');
}

/**
 * Pure client mock: Chex-style screening (score, status, prior-account history).
 * Business applicants use BizChex-style mock data; consumers use Chex-style data.
 * @param {Record<string, unknown>} personData
 * @param {string} [forcedOutcome] When `clear`, `review`, or `decline`, returns that path instead of random.
 * @returns {Promise<{ inquiryType?: string, score: number, status: 'clear'|'review'|'decline', history: { date: string, institution: string, code: string, detail: string }[], mockForcedOutcome?: string }>}
 */
export async function mockChexSystems(personData, forcedOutcome) {
    await delay(CHEX_DELAY_MS);
    const isBiz = chexPayloadIsBusiness(personData);
    const forced = normalizeChexForcedOutcome(forcedOutcome);
    if (isBiz) {
        const body = forced ? buildBusinessChexOutcome(forced) : pickRandomBusinessChexOutcome();
        return forced ? { ...body, mockForcedOutcome: forced } : body;
    }
    const body = forced ? buildConsumerChexOutcome(forced) : pickRandomConsumerChexOutcome();
    return forced ? { ...body, mockForcedOutcome: forced } : body;
}

const PLAID_LINK_DELAY_MS = 1200;

/**
 * Pure client mock: Plaid link success shape (simulated link delay).
 * @param {Record<string, unknown>} accountData
 * @returns {Promise<{ linked: boolean, accountLast4: string, institution: string, balance: number }>}
 */
export async function mockPlaidLink(accountData) {
    void accountData;
    await delay(PLAID_LINK_DELAY_MS);
    return {
        linked: true,
        accountLast4: '4521',
        institution: 'Wells Fargo',
        balance: 5200
    };
}

export function mockAlloySubmit(applicationId, payloadJson) {
    return alloySubmit({ daoApplicationId: applicationId, payloadJson: payloadJson || '{}' });
}

export function mockAlloyPoll(caseId) {
    return alloyPoll({ caseId });
}

export function mockChexInquiry(applicationId, payloadJson) {
    return chexRun({ daoApplicationId: applicationId, payloadJson: payloadJson || '{}' });
}

export function mockPlaidLinkSession(applicationId, payloadJson) {
    return plaidLink({ daoApplicationId: applicationId, payloadJson: payloadJson || '{}' });
}

export function mockPlaidComplete(linkToken) {
    return plaidComplete({ linkToken });
}
