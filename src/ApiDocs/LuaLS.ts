import type { Writable } from "stream";
import { version as bundleVersion } from "../../package.json";

export class LuaLSFile {
	constructor(
		public name:string,
		public app_version:string,
	) {}

	meta?:string = "_";

	members?:(LuaLSFunction|LuaLSClass|LuaLSAlias)[];
	//TODO: module returns? globals?

	add(member:LuaLSFunction|LuaLSClass|LuaLSAlias) {
		if (!this.members) {
			this.members = [];
		}
		this.members.push(member);
	}

	write(output:Writable) {
		if (typeof this.meta === "string") {
			output.write(`---@meta ${this.meta}\n`);
		}
		//output.write(`---@diagnostic disable\n`);
		output.write(`\n`);
		output.write(`--$Factorio ${this.app_version}\n`);
		output.write(`--$Generator ${bundleVersion}\n`);
		output.write(`--$Section ${this.name}\n`);
		output.write(`-- This file is automatically generated. Edits will be overwritten without warning.\n`);
		output.write(`\n`);

		if (this.members) {
			for (const member of this.members) {
				member.write(output);
			}
		}

	}
}

export type LuaLSType = LuaLSTypeName|LuaLSLiteral|LuaLSDict|LuaLSTuple|LuaLSArray|LuaLSUnion;

export class LuaLSTypeName {
	constructor(
		public name:string,
	) {}

	format() {
		return this.name;
	}
}

export class LuaLSLiteral {
	constructor(
		public value:string|number|boolean,
	) {}
	format() {
		switch (typeof this.value) {
			case "string":
				return `"${this.value}"`;
			case "number":
			case "boolean":
				return this.value.toString();

			default:
				throw new Error("Invalid value");

		}
	}
}

export class LuaLSDict {
	constructor(
		public key:LuaLSType,
		public value:LuaLSType,
	) {}


	format():string {
		return `{[${this.key.format()}]:${this.value.format()}}`;
	}
}

export class LuaLSArray {
	constructor(
		public member:LuaLSType,
	) {}

	format():string {
		return `(${this.member.format()})[]`;
	}
}

export class LuaLSTuple {
	constructor(
		public members:LuaLSType[],
	) {}

	format():string {
		return `{${this.members.map((m, i)=>`[${i+1}]:(${m.format()})`).join(", ")}}`;
	}
}

export class LuaLSUnion {
	constructor(
		public members:LuaLSType[],
	) {}

	format():string {
		return this.members.map(m=>`(${m.format()})`).join("|");
	}
}

export class LuaLSAlias {
	constructor(
		public name:string,
		public type:LuaLSType,
		public description?:string,
	) {}


	write(output:Writable) {
		output.write(`---@alias ${this.name} ${this.type.format()}\n\n`);
	}
}

export class LuaLSClass {
	constructor(
		public name:string,
	) {}
	description?:string;
	parent?:string|string[];
	global_name?:string;

	fields?:LuaLSField[];
	functions?:LuaLSFunction[];

	call_op?:LuaLSOverload;

	write(output:Writable) {
		if (this.description) {
			output.write(`---${this.description.replace(/\n/g, "\n---")}\n`);
		}
		output.write(`---@class ${this.name}`);
		if (this.parent) {
			if (typeof this.parent === "string") {
				output.write(`:${this.parent}`);
			} else {
				output.write(`:${this.parent.join(", ")}`);
			}
		}
		output.write(`\n`);

		if (this.fields) {
			for (const field of this.fields) {
				output.write(`---@field ${field.name} ${field.type.format()}`);
				if (field.description) {
					output.write(` @${field.description.replace(/\n/g, "\n---")}`);
				}
				output.write(`\n`);
			}
		}

		if (this.global_name) {
			output.write(`${this.global_name}={}\n`);
		}

		output.write(`\n`);
	}
}

export class LuaLSField {
	constructor(
		public name:string,
		public type:LuaLSType,
	) {}
	name_is_type?:boolean;
	description?:string;

	write(output:Writable) {

	}
}

export class LuaLSOverload {
	params?:LuaLSParam[];
	returns?:LuaLSReturn[];

	write(output:Writable) {

	}
}

export class LuaLSFunction {
	constructor(
		public name:string,
	) {}
	params?:LuaLSParam[];
	returns?:LuaLSReturn[];

	overloads?:LuaLSOverload[];

	nodiscard?:boolean;

	write(output:Writable) {

	}
}

export class LuaLSParam {
	constructor(
		public name:string,
		public type:LuaLSType,
	) {}
	description?:string;
	optional?:boolean;

	write(output:Writable) {
		output.write(`---@param ${this.name}${this.optional?"?":""} ${this.type} ${this.description??""}\n`);
	}
}

export class LuaLSReturn {
	constructor(
		public type:string,
		public name?:string,
	) {}
	description?:string;

	write(output:Writable) {
		output.write(`---@return ${this.type} ${this.name??""} #${this.description??""}\n`);
	}
}