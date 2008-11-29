# Add-on module for AOLServer that implements /~user URLs.
# Based on various examples found on AOLServer forums and web sites.
# Do whatever you like with it, just don't blame me.

proc homedirs {when} {
    set urlv [ns_conn urlv]
    set user [lindex $urlv 0]
    if {[catch {
        set homedir [file native $user]
    }]} {
        ns_returnnotfound
        return "filter_return"
    }

    set url [join [lrange $urlv 1 end] /]
    set file [file join $homedir public_html $url]
    if {[file exists $file]} {
        file stat $file st
        if {$st(type) == "directory"} {
            if {[file exists $file/index.html]} {
                ns_returnfile 200 text/html $file/index.html
            } elseif {[file exists $file/index.adp]} {
                ns_return 200 text/html [ns_adp_parse -file $file/index.adp]
            } else {
                ns_returnforbidden
            }
        } else {
            if {[string match *.adp $file]} {
                ns_return 200 text/html [ns_adp_parse -file $file]
            } else {
                ns_returnfile 200 [ns_guesstype $file] $file
            }
        }
    } else {
        ns_returnnotfound
    }

    return "filter_return"
}

ns_register_filter postauth GET /~* homedirs
