use strict;
use Email::Send;

use Irssi;

my $VERSION = '1.0';
my %IRSSI = (
	author => 'John Morrissey',
	contact => 'jwm@horde.net',
	name => 'email_hilight',
	description => 'E-mail highlighted messages',
	licence => 'BSD',
);
my $FROM = '';
my $TO = '';


my $IS_AWAY = 0;

sub send_notification($$) {
	my ($subject, $message) = @_;

	my $message = <<EOM;
From: $FROM
To: $TO
Subject: irssi: $subject

$message
EOM

	Email::Send->new({
		mailer => 'Sendmail',
	})->send($message);
}


sub sig_print_text {
	my ($dest, $text, $stripped) = @_;

	if ($IS_AWAY &&
	    ($dest->{level} & MSGLEVEL_PUBLIC) &&
	    ($dest->{level} & (MSGLEVEL_HILIGHT|MSGLEVEL_MSGS)) &&
	    ($dest->{level} & MSGLEVEL_NOHILIGHT) == 0) {

		send_notification($dest->{target}, $stripped);
	}
}

sub sig_message_public($$$$$) {	
	my ($server, $msg, $nick, $address, $target) = @_;

	if ($server->{usermode_away}) {
	    $IS_AWAY = 1;
	} else {
	    $IS_AWAY = 0;
	}
}

sub sig_message_private($$$$$) {
	my ($server, $msg, $nick, $address, $target) = @_;

	if ($server->{usermode_away}) {
		send_notification($nick, $msg);
	}
}

Irssi::signal_add('print text', \&sig_print_text);
Irssi::signal_add_last("message public", \&sig_message_public);
Irssi::signal_add_last('message private', \&sig_message_private);
