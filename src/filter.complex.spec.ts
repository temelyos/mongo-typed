/* eslint-disable @typescript-eslint/no-unused-vars */
/**
 * Complex real-world schema coverage for `Filter` / `ObjFilter`.
 *
 * This spec is also the regression guard for type-checker performance. It
 * reconstructs Synergy's `PrivateUser` schema — many scalar fields,
 * arrays-of-objects, deep nesting, a recursive `roles` field, a three-way
 * discriminated union (`LinkedAccount`), and `Record<string, ...>` localized
 * fields. That shape is what drives `ObjFilter<PrivateUser>` instantiation cost,
 * so exercising it in the normal `npm test` run means a refactor of `Filter`
 * that breaks behavior — or reintroduces the instantiation blow-up badly enough
 * to error — fails right here instead of silently.
 *
 * The schema is declared inline (not imported) so it is scoped to this spec and
 * never shipped in `dist`.
 *
 * To measure instantiations ad hoc (there is no dedicated perf config anymore),
 * type-check the whole project — including the spec files — and watch the
 * `Instantiations` line:
 *   npx tsc --noEmit --extendedDiagnostics
 * That uses the root `tsconfig.json`, which includes the specs. Note
 * `tsconfig.build.json` excludes `*.spec.ts`, so `-p tsconfig.build.json` would
 * NOT exercise this scenario.
 */
import { describe, it } from 'node:test';

import type { Assert, Includes } from './types.js';

import { Filter, ObjFilter } from './filter.js';
import { Identifiable } from './identifiable.js';

interface AccessLevel extends Auditable {
	_id: string,
	description?: LocalizedStringInput,
	isSystem: boolean,
	name: string,
	organization?: BasicOrganization,
	position: number,
	tags?: LocalizedStringArrayInput
}
interface Address {
	country?: string,
	district?: string,
	label?: string,
	locality?: string,
	postalCode?: string,
	street?: string[],
	subdistrict?: string,
	sublocality?: string
}

interface Auditable {
	createdAt: Date,
	createdBy: BasicUser,
	updatedAt: Date,
	updatedBy: BasicUser
}

interface BasicOrganization extends Auditable {
	_id: string,
	aliases?: string[],
	deletedAt?: Date,
	deletedBy?: BasicUser,
	encryption: OrganizationEncryption,
	name: string,
	settings?: OrganizationSettings,
	slug?: string
}

interface BasicUser {
	_id: string,
	name?: PersonName,
	profilePicture?: string,
	username: string
}

interface ContactMethod {
	country?: string,
	id: string,
	label?: string,
	type?: string,
	value?: string,
	verifiedAt?: Date
}

interface EncryptedField {
	authTag: string,
	ciphertext: string,
	iv: string,
	keyVersion: number
}

type LinkedAccount = LinkedAccountByName | LinkedAccountWithHash | LinkedAccountWithPasskey;

interface LinkedAccountByName {
	accountName?: string,
	lastUsedAt?: Date,
	service: string,
	sub: string
}

interface LinkedAccountWithHash {
	hash: string,
	lastUsedAt?: Date,
	passwordSetAt?: Date,
	previousHashes?: string[],
	service: string
}

interface LinkedAccountWithPasskey {
	backedUp?: boolean,
	credentialId: string,
	deviceType: 'multiDevice' | 'singleDevice',
	label?: string,
	lastUsedAt?: Date,
	publicKey: string,
	service: 'passkey',
	signCount: number,
	transports?: ('ble' | 'hybrid' | 'internal' | 'nfc' | 'usb')[],
	verifiedAt: Date
}

type LocalizedStringArrayInput = Record<string, string[]> | string[];

type LocalizedStringInput = Record<string, string> | string;

interface OrganizationEncryption {
	activeVersion: number,
	keys: { createdAt: Date, version: number, wrappedDek: string }[]
}

interface OrganizationSettings {
	defaultLanguage?: string,
	theme?: string
}

interface PersonName {
	first?: string,
	last?: string,
	middle?: string,
	prefix?: string,
	suffix?: string
}

type PersonNameInput = PersonName;

interface PrivateUser extends Auditable {
	_id: string,
	accessLevels?: AccessLevel[],
	authorizations?: LinkedAccount[],
	authorizationToken?: string,
	authorizationTokenExpiration?: Date,
	contactMethods?: ContactMethod[],
	country: string,
	deletedAt?: Date,
	deletedBy?: BasicUser,
	isGlobal?: boolean,
	isSuperAdmin?: boolean,
	languageCode: string,
	lastLoginDate?: Date,
	locations?: Address[],
	mustChangePassword?: boolean,
	name?: PersonNameInput,
	organizations?: string[],
	permissions?: string,
	profilePicture?: string,
	removeAuthorizations?: LinkedAccount[],
	roles?: Role[],
	twoFactor?: UserTwoFactor,
	type: 'User',
	username: string
}

interface Role extends Auditable {
	_id: string,
	accessLevels?: AccessLevel[],
	description?: LocalizedStringInput,
	isSystem?: boolean,
	name: LocalizedStringInput,
	organization?: BasicOrganization,
	roles?: Role[],
	tags?: LocalizedStringArrayInput
}

interface TwoFactorEnrollment {
	backedUp?: boolean,
	contactMethodId?: string,
	credentialId?: string,
	deviceType?: 'multiDevice' | 'singleDevice',
	label?: string,
	lastUsedAt?: Date,
	method: string,
	publicKey?: string,
	secret?: EncryptedField,
	signCount?: number,
	transports?: ('ble' | 'hybrid' | 'internal' | 'nfc' | 'usb')[],
	verifiedAt: Date
}

interface UserTwoFactor {
	backupCodes?: { generatedAt: Date, hashes: string[] },
	enrollments?: TwoFactorEnrollment[],
	gracePeriodEndsAt?: Date
}

describe('Filter — complex PrivateUser schema', () => {
	it('accepts a representative where clause (dot-notation, operators, $or)', () => {
		const where: ObjFilter<PrivateUser> = {
			'$or': [
				{ isSuperAdmin: true },
				{ 'twoFactor.gracePeriodEndsAt': { $exists: true } }
			],
			'name.first': { $regex: /^a/ },
			'organizations': { $in: ['64b2f0a1c3d4e5f6a7b8c9d0'] },
			'roles': { $elemMatch: { isSystem: true } },
			'roles.name': 'administrator',
			'username': { $in: ['alice', 'bob'] }
		};

		void where;
	});

	it('round-trips through a generic clone helper', () => {
		function clone<T>(value: T): T {
			return value;
		}

		const where: ObjFilter<PrivateUser> = { username: { $in: ['alice', 'bob'] } };
		const cloned: ObjFilter<PrivateUser> = clone(where);

		void cloned;
	});

	it('accepts a generic repository find({ where }) call-site', async () => {
		async function find<T extends Identifiable>(options: { where?: ObjFilter<T> }): Promise<T[]> {
			return [];
		}

		await find<PrivateUser>({
			where: {
				'_id': { $in: ['64b2f0a1c3d4e5f6a7b8c9d0'] },
				'authorizations': { $elemMatch: { service: 'passkey' } },
				'country': 'US',
				'deletedBy._id': { $exists: false },
				'mustChangePassword': true
			}
		});
	});

	it('supports nested $and / $or / $nor recursion', () => {
		const where: ObjFilter<PrivateUser> = {
			$and: [
				{ $or: [{ isGlobal: true }, { 'name.last': 'smith' }] },
				{ $nor: [{ isSuperAdmin: true }, { 'twoFactor.enrollments.method': 'totp' }] }
			]
		};

		void where;
	});

	it('Filter<PrivateUser> top-level entry point parity', () => {
		const where: Filter<PrivateUser> = {
			'accessLevels.position': { $gte: 0 },
			'contactMethods.value': { $regex: /@/ },
			'locations.country': 'US'
		};

		void where;
	});

	it('pins Filter<PrivateUser> value shapes (guards against a perf refactor changing behavior)', () => {
		type Scalar = Assert<Includes<Filter<PrivateUser>['username'], string>>;
		type Bool = Assert<Includes<Filter<PrivateUser>['isSuperAdmin'], { $exists: true }>>;
		type DotNested = Assert<Includes<Filter<PrivateUser>['name.first'], string>>;
		type ArrayElem = Assert<Includes<Filter<PrivateUser>['roles'], { $elemMatch: Filter<Role> }>>;
		type BooleanRecursion = Assert<Includes<Filter<PrivateUser>['$and'], Filter<PrivateUser>[]>>;
	});
});
