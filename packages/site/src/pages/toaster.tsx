import { InvestLinea } from "../components/toaster/invest-linea";
import { Invest1inch } from "../components/toaster/invest-1inch";

const Toaster = () => {
    return (
        <div className="h-screen p-12 bg-neutral-50">
           <Invest1inch />
           <InvestLinea />
        </div>
    )

}

export default Toaster;