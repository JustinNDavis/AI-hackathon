import { LightningElement, api, track } from 'lwc';

const PRIMARY_ID = 'primary-applicant';

/** Personal relationship to the primary consumer applicant (joint owner). */
const JOINT_RELATIONSHIP_OPTIONS = [
    { label: 'Spouse', value: 'Spouse' },
    { label: 'Domestic Partner', value: 'Domestic_Partner' },
    { label: 'Parent', value: 'Parent' },
    { label: 'Child', value: 'Child' },
    { label: 'Sibling', value: 'Sibling' },
    { label: 'Other', value: 'Other' }
];

/** Role or capacity with respect to the business entity (authorized signers / control). */
const BUSINESS_SIGNER_CAPACITY_OPTIONS = [
    { label: 'President', value: 'President' },
    { label: 'Vice President', value: 'Vice_President' },
    { label: 'Treasurer / CFO', value: 'Treasurer_CFO' },
    { label: 'Secretary', value: 'Secretary' },
    { label: 'Managing Member', value: 'Managing_Member' },
    { label: 'Member / Owner', value: 'Member_Owner' },
    { label: 'General Partner', value: 'General_Partner' },
    { label: 'Partner', value: 'Partner' },
    { label: 'Authorized Signer (non-officer)', value: 'Authorized_Signer' },
    { label: 'Control Person', value: 'Control_Person' },
    { label: 'Beneficial Owner', value: 'Beneficial_Owner' },
    { label: 'Other', value: 'Other' }
];

const PRIMARY_GUARDIAN_REL_OPTIONS = [
    { label: 'Parent', value: 'Parent' },
    { label: 'Legal Guardian', value: 'Legal_Guardian' },
    { label: 'Custodian', value: 'Custodian' },
    { label: 'Grandparent', value: 'Grandparent' },
    { label: 'Other', value: 'Other' }
];

const OTHER_GUARDIAN_REL_OPTIONS = [
    { label: 'Parent', value: 'Parent' },
    { label: 'Legal Guardian', value: 'Legal_Guardian' },
    { label: 'Custodian', value: 'Custodian' },
    { label: 'Other', value: 'Other' }
];

function genId() {
    return 'pty-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
}

export default class DaoPartyGather extends LightningElement {
    @api applicationData;

    primaryGuardianRelOptions = PRIMARY_GUARDIAN_REL_OPTIONS;
    otherGuardianRelOptions = OTHER_GUARDIAN_REL_OPTIONS;

    /** Joint account holders (not including primary / custodial rows). */
    @track jointHolders = [];

    @track isCustodialMinor = false;
    @track primaryIsGuardian = true;
    @track guardianRelationshipToMinor = '';

    @track minorFullName = '';
    @track minorDateOfBirth = '';
    @track minorSsn = '';

    @track guardianFullName = '';
    @track guardianDateOfBirth = '';
    @track guardianSsn = '';
    @track guardianRelationship = '';

    @track showJointForm = false;
    @track jointFullName = '';
    @track jointDateOfBirth = '';
    @track jointSsn = '';
    @track jointRelationship = '';

    connectedCallback() {
        this.hydrateFromApplicationData();
        this.dispatchPatch();
    }

    get isBusinessApplicant() {
        return this.applicationData?.applicantEntityType === 'Business';
    }

    get isBusinessApplicantInverse() {
        return !this.isBusinessApplicant;
    }

    get showCustodialSection() {
        return !this.isBusinessApplicant;
    }

    get addJointPartyLabel() {
        return this.isBusinessApplicant ? 'Add authorized signer' : 'Add joint account holder';
    }

    get jointFormPanelTitle() {
        return this.isBusinessApplicant ? 'Authorized signer' : 'Joint account holder';
    }

    get jointRelationshipOptions() {
        return this.isBusinessApplicant ? BUSINESS_SIGNER_CAPACITY_OPTIONS : JOINT_RELATIONSHIP_OPTIONS;
    }

    get jointRelationshipFieldLabel() {
        return this.isBusinessApplicant
            ? 'Capacity or role with the business'
            : 'Relationship to primary applicant';
    }

    get jointRelationshipPlaceholder() {
        return this.isBusinessApplicant ? 'Select capacity or role' : 'Select relationship';
    }

    get addJointSubmitLabel() {
        return this.isBusinessApplicant ? 'Add signer' : 'Add joint holder';
    }

    hydrateFromApplicationData() {
        const saved = this.applicationData?.parties;
        if (saved && Array.isArray(saved) && saved.length > 0) {
            this.jointHolders = saved
                .filter((p) => p.role === 'JointAccountHolder')
                .map((p) => ({ ...p }));

            const minor = saved.find((p) => p.role === 'Minor');
            const guardian = saved.find((p) => p.role === 'Guardian');
            const primary = saved.find((p) => p.id === PRIMARY_ID || p.role === 'PrimaryApplicant');

            this.isCustodialMinor = !!this.applicationData?.isCustodialMinor || !!minor;
            if (minor) {
                this.minorFullName = minor.fullName || '';
                this.minorDateOfBirth = minor.dateOfBirth || '';
                this.minorSsn = minor.ssn || '';
            }

            if (guardian) {
                this.primaryIsGuardian = false;
                this.guardianFullName = guardian.fullName || '';
                this.guardianDateOfBirth = guardian.dateOfBirth || '';
                this.guardianSsn = guardian.ssn || '';
                this.guardianRelationship = guardian.relationship || '';
            } else if (primary?.isGuardianForMinor) {
                this.primaryIsGuardian = true;
                this.guardianRelationshipToMinor = primary.relationshipToMinor || '';
            }

            const d = this.applicationData?.custodialDetails;
            if (d) {
                this.isCustodialMinor = !!this.applicationData?.isCustodialMinor;
                if (d.primaryIsGuardian === false) {
                    this.primaryIsGuardian = false;
                }
                if (d.guardianRelationshipToMinor) {
                    this.guardianRelationshipToMinor = d.guardianRelationshipToMinor;
                }
                if (d.minorFullName) {
                    this.minorFullName = d.minorFullName;
                }
                if (d.minorDateOfBirth) {
                    this.minorDateOfBirth = d.minorDateOfBirth;
                }
                if (d.minorSsn) {
                    this.minorSsn = d.minorSsn;
                }
                if (d.guardianFullName) {
                    this.guardianFullName = d.guardianFullName;
                }
                if (d.guardianDateOfBirth) {
                    this.guardianDateOfBirth = d.guardianDateOfBirth;
                }
                if (d.guardianSsn) {
                    this.guardianSsn = d.guardianSsn;
                }
                if (d.guardianRelationship) {
                    this.guardianRelationship = d.guardianRelationship;
                }
            }
        } else {
            this.isCustodialMinor = !!this.applicationData?.isCustodialMinor;
            const d = this.applicationData?.custodialDetails;
            if (d) {
                this.primaryIsGuardian = d.primaryIsGuardian !== false;
                this.guardianRelationshipToMinor = d.guardianRelationshipToMinor || '';
                this.minorFullName = d.minorFullName || '';
                this.minorDateOfBirth = d.minorDateOfBirth || '';
                this.minorSsn = d.minorSsn || '';
                this.guardianFullName = d.guardianFullName || '';
                this.guardianDateOfBirth = d.guardianDateOfBirth || '';
                this.guardianSsn = d.guardianSsn || '';
                this.guardianRelationship = d.guardianRelationship || '';
            }
        }
    }

    buildPrimaryParty() {
        const acct = this.applicationData?.customerLookup?.accountData || {};
        const isBiz = this.applicationData?.applicantEntityType === 'Business';
        const name =
            (acct.name || '').trim() ||
            [acct.firstName, acct.lastName].filter(Boolean).join(' ').trim() ||
            (isBiz ? 'Business' : 'Primary applicant');
        return {
            id: PRIMARY_ID,
            role: 'PrimaryApplicant',
            fullName: name,
            dateOfBirth: isBiz ? null : acct.personBirthdate || null,
            ssnLast4: isBiz ? null : acct.ssnLast4 || null,
            einLast4: isBiz ? acct.einLast4 || null : null,
            isBusinessEntity: isBiz,
            relationship: null
        };
    }

    buildPrimaryWithGuardianFlags() {
        const base = this.buildPrimaryParty();
        if (this.isCustodialMinor && this.primaryIsGuardian && this.guardianRelationshipToMinor) {
            return {
                ...base,
                isGuardianForMinor: true,
                relationshipToMinor: this.guardianRelationshipToMinor
            };
        }
        return base;
    }

    get displayParties() {
        const list = [this.buildPrimaryWithGuardianFlags()];
        list.push(...this.jointHolders);
        if (this.isCustodialMinor && this.minorFullName?.trim()) {
            list.push({
                id: 'minor-custodial',
                role: 'Minor',
                fullName: this.minorFullName.trim(),
                dateOfBirth: this.minorDateOfBirth || null,
                ssn: this.minorSsn || null,
                relationship: null
            });
        }
        if (this.isCustodialMinor && !this.primaryIsGuardian && this.guardianFullName?.trim()) {
            list.push({
                id: 'guardian-custodial',
                role: 'Guardian',
                fullName: this.guardianFullName.trim(),
                dateOfBirth: this.guardianDateOfBirth || null,
                ssn: this.guardianSsn || null,
                relationship: this.guardianRelationship || null
            });
        }
        return list;
    }

    formatRel(value) {
        if (!value) {
            return '';
        }
        return String(value).replace(/_/g, ' ');
    }

    get rowsForUi() {
        return this.displayParties.map((p) => {
            const parts = [];
            if (p.role === 'JointAccountHolder' && p.relationship) {
                const relHeading = this.isBusinessApplicant ? 'Capacity' : 'Relationship';
                parts.push(relHeading + ': ' + this.formatRel(p.relationship));
            }
            if (p.dateOfBirth) {
                parts.push('DOB: ' + p.dateOfBirth);
            }
            if (p.role === 'PrimaryApplicant') {
                if (p.isBusinessEntity && p.einLast4) {
                    parts.push('EIN ····' + p.einLast4);
                } else if (!p.isBusinessEntity && p.ssnLast4) {
                    parts.push('SSN ····' + p.ssnLast4);
                }
                if (p.isGuardianForMinor && p.relationshipToMinor) {
                    parts.push('Guardian for minor · ' + this.formatRel(p.relationshipToMinor));
                }
            }
            return {
                key: p.id,
                partyId: p.id,
                fullName: p.fullName,
                role: p.role,
                badgeLabel: this.roleBadgeLabel(p),
                badgeClassStr: this.badgeClass(p.role),
                subLine: parts.join(' · '),
                showRemove: p.id !== PRIMARY_ID
            };
        });
    }

    get showJointFormInverse() {
        return !this.showJointForm;
    }

    get primaryIsGuardianInverse() {
        return !this.primaryIsGuardian;
    }

    roleBadgeLabel(party) {
        const role = party?.role;
        if (role === 'PrimaryApplicant' && party?.isBusinessEntity) {
            return 'Business';
        }
        switch (role) {
            case 'PrimaryApplicant':
                return 'Primary';
            case 'JointAccountHolder':
                return this.isBusinessApplicant ? 'Signer' : 'Joint';
            case 'Minor':
                return 'Minor';
            case 'Guardian':
                return 'Guardian';
            default:
                return role || 'Party';
        }
    }

    badgeClass(role) {
        if (role === 'PrimaryApplicant') {
            return 'slds-badge slds-badge_inverse';
        }
        if (role === 'JointAccountHolder') {
            return 'slds-badge';
        }
        if (role === 'Minor') {
            return 'slds-badge slds-theme_warning';
        }
        if (role === 'Guardian') {
            return 'slds-badge slds-theme_success';
        }
        return 'slds-badge';
    }

    handleCustodialToggle(event) {
        this.isCustodialMinor = event.target.checked;
        if (!this.isCustodialMinor) {
            this.minorFullName = '';
            this.minorDateOfBirth = '';
            this.minorSsn = '';
            this.guardianFullName = '';
            this.guardianDateOfBirth = '';
            this.guardianSsn = '';
            this.guardianRelationship = '';
            this.primaryIsGuardian = true;
            this.guardianRelationshipToMinor = '';
        }
        this.dispatchPatch();
    }

    handlePrimaryIsGuardianChange(event) {
        this.primaryIsGuardian = event.target.checked;
        if (this.primaryIsGuardian) {
            this.guardianFullName = '';
            this.guardianDateOfBirth = '';
            this.guardianSsn = '';
            this.guardianRelationship = '';
        } else {
            this.guardianRelationshipToMinor = '';
        }
        this.dispatchPatch();
    }

    handleMinorFieldChange(event) {
        const f = event.target.dataset.field;
        const v = event.target.value;
        if (f === 'name') {
            this.minorFullName = v;
        } else if (f === 'dob') {
            this.minorDateOfBirth = v;
        } else if (f === 'ssn') {
            this.minorSsn = v;
        }
        this.dispatchPatch();
    }

    handlePrimaryGuardianRelChange(event) {
        this.guardianRelationshipToMinor = event.detail.value;
        this.dispatchPatch();
    }

    handleOtherGuardianRelChange(event) {
        this.guardianRelationship = event.detail.value;
        this.dispatchPatch();
    }

    handleOtherGuardianInputChange(event) {
        const f = event.target.dataset.field;
        const v = event.target.value;
        if (f === 'name') {
            this.guardianFullName = v;
        } else if (f === 'dob') {
            this.guardianDateOfBirth = v;
        } else if (f === 'ssn') {
            this.guardianSsn = v;
        }
        this.dispatchPatch();
    }

    handleToggleJointForm() {
        this.showJointForm = !this.showJointForm;
        if (!this.showJointForm) {
            this.jointFullName = '';
            this.jointDateOfBirth = '';
            this.jointSsn = '';
            this.jointRelationship = '';
        }
    }

    handleJointFieldChange(event) {
        const t = event.currentTarget;
        if (t.dataset.field === 'relationship') {
            this.jointRelationship = event.detail.value;
            return;
        }
        const f = t.dataset.field;
        const v = t.value;
        if (f === 'name') {
            this.jointFullName = v;
        } else if (f === 'dob') {
            this.jointDateOfBirth = v;
        } else if (f === 'ssn') {
            this.jointSsn = v;
        }
    }

    handleAddJoint() {
        if (!this.jointFullName?.trim() || !this.jointRelationship) {
            return;
        }
        this.jointHolders = [
            ...this.jointHolders,
            {
                id: genId(),
                role: 'JointAccountHolder',
                fullName: this.jointFullName.trim(),
                dateOfBirth: this.jointDateOfBirth || null,
                ssn: this.jointSsn || null,
                relationship: this.jointRelationship
            }
        ];
        this.jointFullName = '';
        this.jointDateOfBirth = '';
        this.jointSsn = '';
        this.jointRelationship = '';
        this.showJointForm = false;
        this.dispatchPatch();
    }

    handleRemoveParty(event) {
        const id = event.currentTarget.dataset.id;
        if (!id || id === PRIMARY_ID) {
            return;
        }
        if (id === 'minor-custodial') {
            this.minorFullName = '';
            this.minorDateOfBirth = '';
            this.minorSsn = '';
            this.dispatchPatch();
            return;
        }
        if (id === 'guardian-custodial') {
            this.guardianFullName = '';
            this.guardianDateOfBirth = '';
            this.guardianSsn = '';
            this.guardianRelationship = '';
            this.primaryIsGuardian = true;
            this.dispatchPatch();
            return;
        }
        this.jointHolders = this.jointHolders.filter((j) => j.id !== id);
        this.dispatchPatch();
    }

    dispatchPatch() {
        this.dispatchEvent(
            new CustomEvent('daowizarddatapatch', {
                bubbles: true,
                composed: true,
                detail: {
                    parties: JSON.parse(JSON.stringify(this.displayParties)),
                    isCustodialMinor: this.isCustodialMinor,
                    custodialDetails: {
                        primaryIsGuardian: this.primaryIsGuardian,
                        guardianRelationshipToMinor: this.guardianRelationshipToMinor || null,
                        minorFullName: this.minorFullName || null,
                        minorDateOfBirth: this.minorDateOfBirth || null,
                        minorSsn: this.minorSsn || null,
                        guardianFullName: this.guardianFullName || null,
                        guardianDateOfBirth: this.guardianDateOfBirth || null,
                        guardianSsn: this.guardianSsn || null,
                        guardianRelationship: this.guardianRelationship || null
                    }
                }
            })
        );
    }
}
