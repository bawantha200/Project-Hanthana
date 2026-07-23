import Router from "./router/router.jsx";
import { Toaster } from 'react-hot-toast';   

const App = () => {
    return (
        <>
            <Toaster 
                position="top-right"
                containerStyle={{
                    zIndex: 99999,   
                }}
            />
            <Router />
        </>
    );
};

export default App;