export type VPinNumber = 2 | 3 | 4 | 17 | 27 | 22 | 10 | 9 | 11 | 0 | 5 | 6 | 13 | 19 | 26 | 14 | 15 | 18 | 23 | 24 | 25 | 8 | 7 | 1 | 12 | 16 | 20 | 21;
export enum PinDirection {
    IN = "in", OUT= "out"
}

/**
 * Sleep for the given microseconds.
 * > NOTE: requires the use of --allow-hrtime for this method to work.
 * > NOTE: this isint really that accurate.. considering it's javascript and all
 * @example ``` deno run --allow-hrtime <script>```
 * @requires --allow-hrtime
 * @param v the amount of microseconds before resolving the promise
 * @returns a promise that resolves after the time has passed
 */
 export function sleepMicroseconds(v: number){
    const end = performance.now() + parseFloat(`0.${v}`);
    while(performance.now() < end);
}

/**
 * Not adding sudo might misbehave on repeated runs.
 */
// deno-lint-ignore prefer-const
export let FORCE_SUDO = true;

async function runEchoReplaceCommand(value: string, toFile: string){
    return await Deno.run({
        cmd: [...(FORCE_SUDO ? ["sudo"] : []), "bash","-c", `echo ${value} > ${toFile}`]
    }).status()
}

function unexportOnGC(pin: Pin){
    const registry = new FinalizationRegistry((heldValue: number) => {
        Pin.unexportPin(heldValue)
    });
    registry.register(pin, pin.number);
}

export interface Options {
    /**
     * Wether we should un-export the pin if a termination OS signal is captured.
     */
    unexportOnSig: boolean
}
const defaultOptions: Options = {
    unexportOnSig: true
}

export class Pin {
    readonly number: VPinNumber;
    ready: Promise<void>;

    // TODO: implement options
    /**
     * 
     * @param number The GPIO pin number (e.g. GPIO23 -> 23)
     * @param direction The current flow direction. in being to receive and out being to send out
     * @param initialState optional property to automatically set the state as soon as pin is exported
     * @param options further configuration.
     */
    constructor(number: VPinNumber, direction: PinDirection, initialState?: number, options: Options = defaultOptions){
        this.number = number;
        this.ready = new Promise((resolve)=>{
            Pin.exportPin(this).then(async ()=>{
                await this.setDirection(direction);
                resolve();
                if(initialState !== undefined) await this.setPin(initialState);
            })
        })

        unexportOnGC(this);
    }
    // TODO: sequence method to run all async methods provided in sequence


    async readPin(){
        await this.ready;
        return new TextDecoder().decode(
            await Deno
            .run({cmd: ["cat", `/sys/class/gpio/gpio${this.number}/value`], stdout: 'piped'})
            .output()
        )
    }

    /**
     * 
     * @param value 0 for low, 1 for high
     */
    async setPin(value: number){
        await this.ready
        return await runEchoReplaceCommand(value.toString(), `/sys/class/gpio/gpio${this.number}/value`)
    }

    async setDirection(d: PinDirection) {
        return await runEchoReplaceCommand(d, `/sys/class/gpio/gpio${this.number}/direction`)
    }


    async getDirection(): Promise<PinDirection> {
        return new TextDecoder().decode(
            await Deno
            .run({cmd: ["cat", `/sys/class/gpio/gpio${this.number}/direction`], stdout: 'piped'})
            .output()
        ).includes('out') ? PinDirection.OUT : PinDirection.IN;
    }

    static async exportPin(pin: Pin){
        return await runEchoReplaceCommand(pin.number.toString(), "/sys/class/gpio/export")
    }
    
    async unexport() {
        return await Pin.unexportPin(this)
    }
    
    static async unexportPin(pin: Pin | number){
        const pinNumber: string = (typeof pin === "number" ? pin : pin.number).toString();
        return await runEchoReplaceCommand(pinNumber, "/sys/class/gpio/unexport")
    }

    async isExported(){
        return await Pin.isPinExported(this);
    }

    static async isPinExported(pin: Pin): Promise<boolean> {
        return new TextDecoder()
        .decode(await Deno.run({cmd: ["ls", "/sys/class/gpio"], stdout: "piped"}).output())
        .includes(`gpio${pin.number}`);
    }
}


