# Sends auto-replies to AIM users when they message while you are away.
# 
# SETTINGS
# [bitlbee]
# bitlbee_autoreply_duration = OFF
#   -> Send how long you have been away in your auto-reply. This requires
#      Time::Duration. 
#      Example auto-reply: "gone (away: 3 minutes and 2 seconds)"
use strict;
use Irssi::TextUI;

use vars qw($VERSION %IRSSI);

$VERSION = '0.11';
%IRSSI = (
    authors     => 'Matt "f0rked" Sparks',
    contact     => 'root@f0rked.com',
    name        => 'bitlbee status notice',
    description => 'Adds detailed information about status changes to bitlbee query windows',
    license     => 'GPLv2',
    url         => 'http://f0rked.com',
    changed     => '2005-12-04',
);

my $bitlbee_channel="&bitlbee";
my $bitlbee_server_tag="bitlbee";

my(%times,$away,$away_time);

sub away {
    $away_time=time;
    %times=();
}

sub event_msg {
    my($server,$msg,$nick,$address,$target)=@_;
    return if $server->{tag} ne $bitlbee_server_tag;
    return unless $server->{usermode_away};
    return unless $address =~ /\@login\.oscar\.aol\.com$/; # Only send for AIM.
    return unless !$target or ($target eq $bitlbee_channel and $nick ne "root");
    return unless time-$times{$nick} > 3600; # send an auto-reply once an hour.
    $times{$nick}=time;
    my $append;
#    if (Irssi::settings_get_bool("bitlbee_autoreply_duration") && $away_time) {
#        use Time::Duration qw(duration_exact);
#        $append=" (away: ".duration_exact(time-$away_time).")";
#    }
    $server->command("/notice $nick $server->{away_reason}$append");
}

Irssi::signal_add("message private","event_msg");
Irssi::signal_add("message public","event_msg");
Irssi::signal_add("away mode changed","away");

Irssi::settings_add_bool("bitlbee","bitlbee_autoreply_duration",0);
