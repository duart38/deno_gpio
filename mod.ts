import singleton from "https://raw.githubusercontent.com/grevend/singleton/main/mod.ts"
export type VPinNumber = 2 | 3 | 4 | 17 | 27 | 22 | 10 | 9 | 11 | 0 | 5 | 6 | 13 | 19 | 26 | 14 | 15 | 18 | 23 | 24 | 25 | 8 | 7 | 1 | 12 | 16 | 20 | 21;
export enum PinDirection {
    IN = "in", OUT= "out"
}

/**
 * Not adding sudo might misbehave on repeated runs.
 */
// deno-lint-ignore prefer-const
export let FORCE_SUDO = true;

// async function runEchoReplaceCommand(value: string, toFile: string){
//     return await Deno.run({
//         cmd: [...(FORCE_SUDO ? ["sudo"] : []), "bash","-c", `echo ${value} > ${toFile}`]
//     }).status()
// }

function unexportOnGC(pin: Pin){
    const registry = new FinalizationRegistry((heldValue: number) => {
        Pin.unexport(heldValue)
    });
    registry.register(pin, pin.number);
}

export interface Options {
    /**
     * Wether we should un-export the pin if a termination OS signal is captured.
     */
    unexportOnSig: boolean,
}
const defaultOptions: Options = {
    unexportOnSig: true,
}

export class InstructionsQueue {
    private cmd: string[] = [];
    add(c: string){
        this.cmd.push(c)
    }
    async execute(){
        await Deno.run({
            cmd: [...(FORCE_SUDO ? ["sudo"] : []), "bash","-c", `${this.cmd.join(";")}`]
        }).status()
        this.cmd = [];
    }
}
export const instructionsQueue = singleton(()=>new InstructionsQueue());
export async function executeInstructions(){
    return await instructionsQueue.getInstance().execute();
}

type PinValue = 1 | 0;

/**
 * Sleeps in between commands for the given seconds. milli, micro and nano seconds are supported.
 * > to sleep for 40 microseconds you may use ``` sleep(4e-5); ```
 * @param seconds the seconds to sleep for.
 */
export function sleep(seconds: number){
    instructionsQueue.getInstance().add(`sleep ${seconds}`)
}
export class Pin {
    readonly number: VPinNumber;

    // TODO: implement options
    /**
     * Instantiates a new pin for usage. the newly created pin will be automatically exported.
     * @param number The GPIO pin number (e.g. GPIO23 -> 23)
     * @param direction The current flow direction. in being to receive and out being to send out
     * @param initialState optional property to automatically set the state as soon as pin is exported
     * @param options further configuration.
     */
    constructor(number: VPinNumber, direction: PinDirection, initialState?: PinValue, options: Options = defaultOptions){
        this.number = number;
        Pin.export(this)
        this.setDirection(direction);
        if(initialState !== undefined) this.setValue(initialState);

        unexportOnGC(this);
    }

    /**
     * Reads the value of this pin.
     * > NOTE: this method is not very price timing wise. use pipeValue to queue up an instruction and execute with precise timing.
     * @returns the value of the pin (1 or 0)
     */
    readValue(): number {
        return Deno.readFileSync(`/sys/class/gpio/gpio${this.number}/value`)[0]  - 48
    }

    pipeValue(){}

    /**
     * Sets the pin value. to be used when the direction is set to out
     * @param value 0 for low, 1 for high
     * @returns status of the operation
     */
    setValue(value: PinValue){
        instructionsQueue.getInstance().add(`echo ${value} > /sys/class/gpio/gpio${this.number}/value`)
    }

    /**
     * Sets the pin direction (in or out)
     * @param d the direction
     * @returns status of the operation
     */
    setDirection(d: PinDirection) {
        instructionsQueue.getInstance().add(`echo ${d} > /sys/class/gpio/gpio${this.number}/direction`)
    }

    /**
     * Fetches the current pin direction from the system.
     * > Useful if other programs will be changing the pin direction.
     * @returns the pin direction
     */
    async getDirection(): Promise<PinDirection> {
        return new TextDecoder().decode(
            await Deno
            .run({cmd: ["cat", `/sys/class/gpio/gpio${this.number}/direction`], stdout: 'piped'})
            .output()
        ).includes('out') ? PinDirection.OUT : PinDirection.IN;
    }

    /**
     * Exports a pin. required before you operate with the pin.
     * @param pin the pin to export
     * @returns the process status
     */
    static export(pin: Pin){
        instructionsQueue.getInstance().add(`echo ${pin.number.toString()} > /sys/class/gpio/export`)
    }
    
    /**
     * Removes an exported pin.
     * @returns the status of the process
     */
    unexport() {
        return Pin.unexport(this)
    }
    
    static unexport(pin: Pin | number){
        const pinNumber: string = (typeof pin === "number" ? pin : pin.number).toString();
        instructionsQueue.getInstance().add(`echo ${pinNumber} > /sys/class/gpio/unexport`)
    }

    /**
     * Checks if this pin is already exported.
     * @returns true if the pin is exported, false otherwise.
     */
    isExported(){
        return Pin.isExported(this);
    }

    static isExported(pin: Pin): boolean {
        for(const {name} of Deno.readDirSync("/sys/class/gpio")) if(name.includes(`gpio${pin.number}`)) return true;
        return false;
    }

    // TODO: write pin value to buffer from bash execution stack.. useful when timing is important.
    // TODO: read from buffer (option to empty the buffer? or make default)
}


