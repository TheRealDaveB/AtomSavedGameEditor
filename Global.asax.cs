using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.Mvc;
using System.Web.Optimization;
using System.Web.Routing;

namespace AtomEditorWebsite
{
    public class MvcApplication : System.Web.HttpApplication
    {
        protected void Application_Start()
        {
            AreaRegistration.RegisterAllAreas();
            GlobalFilters.Filters.Add(new HandleErrorAttribute());

            RouteTable.Routes.IgnoreRoute("{resource}.axd/{*pathInfo}");
            RouteTable.Routes.MapRoute(
                name: "Default",
                url: "{controller}/{action}/{id}",
                defaults: new { controller = "Home", action = "Index", id = UrlParameter.Optional }
            );
        }

        protected void Application_BeginRequest()
        {
            // Redirect http requests to https
            if (!Context.Request.IsSecureConnection)
            {
                UriBuilder builder = new UriBuilder(Context.Request.Url);
                if (builder.Host != "localhost")
                {
                    builder.Scheme = "https";
                    builder.Port = 443;
                    Response.RedirectPermanent(builder.ToString());
                }
            }
        }
    }
}
