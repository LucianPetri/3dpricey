import { Outlet } from "react-router-dom";

const Layout = () => {
    return (
        <div className="flex flex-col min-h-screen">
            <Outlet />
        </div>
    );
};

export default Layout;
