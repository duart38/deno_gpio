export type VPinNumber = 2 | 3 | 4 | 17 | 27 | 22 | 10 | 9 | 11 | 0 | 5 | 6 | 13 | 19 | 26 | 14 | 15 | 18 | 23 | 24 | 25 | 8 | 7 | 1 | 12 | 16 | 20 | 21;
export enum PinDirection {
    IN = "in", OUT= "out"
}

async function runEchoReplaceCommand(value: string, toFile: string){
    return await Deno.run({
        cmd: ["bash","-c", `echo ${value} > ${toFile}`]
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

    // TODO: identify safety of pin with parameter? e.g. unsafe: bool
    // TODO: implement options
    constructor(number: VPinNumber, direction: PinDirection, options: Options = defaultOptions){
        this.number = number;
        this.ready = new Promise((resolve)=>{
            Pin.exportPin(this).then(async ()=>{
                await this.setDirection(direction);
                resolve()
            })
        })

        unexportOnGC(this);
    }


    // TODO: If an output pin, set the level to low or high.
    // TODO: If an input pin, read the pin's level (low or high).

    // TODO: what about analogue pin support

    async readPin(){

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
        return await runEchoReplaceCommand(d, `/sys/class/gpio/gpio${this.number.toString()}/direction`)
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


