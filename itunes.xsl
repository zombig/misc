<!--
	iTunes to HTML Stylesheet
	John Morrissey

	Do what you want with it as long as my name is mentioned as author,
	just don't blame me.
-->

<xsl:stylesheet
     xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
     version="1.0">

	<xsl:output method="html" />

	<xsl:template match="text()" />

	<xsl:template match="plist/dict/dict[preceding-sibling::key[text() = 'Tracks']]">
		<style>
			.header {
				color: black;
				background-color: #e9e9e9;
				height: 25px;
				font-family: Verdana,Helvetica,sans-serif;
				font-weight: bold;
				font-size: 15px;
				padding-left: 3px;
				padding-right: 3px;
			}
			.item0 {
				color: black;
				background-color: #f3f3f3;
			}
			.item1 {
				color: black;
				background-color: #d9d9d9;
			}
			.grid {
				background-color: #999999;
			}
		</style>

		<table class="grid" border="0" width="100%" cellpadding="2" cellspacing="1">
			<tr class="header">
				<td>Artist</td>
				<td>Name</td>
				<td>Album</td>
				<td>Size (Mbytes)</td>
				<td>Length (hh:mm:ss)</td>
				<td>Play<xsl:text disable-output-escaping="yes">&amp;</xsl:text>nbsp;Count</td>
			</tr>
			<xsl:apply-templates select="dict" mode="display">
				<xsl:sort select="key[. = 'Artist']/following-sibling::*/text()" />
			</xsl:apply-templates>
		</table>
	</xsl:template>

	<xsl:template match="dict" mode="display">
		<tr class="item{position() mod 2}">
			<xsl:choose>
				<xsl:when test="key[. = 'Artist']">
					<xsl:apply-templates select="key[. = 'Artist']" mode="display" />
				</xsl:when>
				<xsl:otherwise>
					<td><xsl:text disable-output-escaping="yes">&amp;</xsl:text>nbsp;</td>
				</xsl:otherwise>
			</xsl:choose>
			<xsl:choose>
				<xsl:when test="key[. = 'Name']">
					<xsl:apply-templates select="key[. = 'Name']" mode="display" />
				</xsl:when>
				<xsl:otherwise>
					<td><xsl:text disable-output-escaping="yes">&amp;</xsl:text>nbsp;</td>
				</xsl:otherwise>
			</xsl:choose>
			<xsl:choose>
				<xsl:when test="key[. = 'Album']">
					<xsl:apply-templates select="key[. = 'Album']" mode="display" />
				</xsl:when>
				<xsl:otherwise>
					<td><xsl:text disable-output-escaping="yes">&amp;</xsl:text>nbsp;</td>
				</xsl:otherwise>
			</xsl:choose>
			<xsl:choose>
				<xsl:when test="key[. = 'Size']">
					<xsl:apply-templates select="key[. = 'Size']" mode="display" />
				</xsl:when>
				<xsl:otherwise>
					<td><xsl:text disable-output-escaping="yes">&amp;</xsl:text>nbsp;</td>
				</xsl:otherwise>
			</xsl:choose>
			<xsl:choose>
				<xsl:when test="key[. = 'Total Time']">
					<xsl:apply-templates select="key[. = 'Total Time']" mode="display" />
				</xsl:when>
				<xsl:otherwise>
					<td><xsl:text disable-output-escaping="yes">&amp;</xsl:text>nbsp;</td>
				</xsl:otherwise>
			</xsl:choose>
			<xsl:choose>
				<xsl:when test="key[. = 'Play Count']">
					<xsl:apply-templates select="key[. = 'Play Count']" mode="display" />
				</xsl:when>
				<xsl:otherwise>
					<td><xsl:text disable-output-escaping="yes">&amp;</xsl:text>nbsp;</td>
				</xsl:otherwise>
			</xsl:choose>
		</tr>
	</xsl:template>

	<xsl:template match="key" mode="display">
		<td>
			<xsl:choose>
				<xsl:when test=". = 'Size'">
					<xsl:value-of select="format-number(following-sibling::*/text() div 1000000, '#.0')" />
				</xsl:when>
				<xsl:when test=". = 'Total Time'">
		            <xsl:variable name="hours" select="following-sibling::*/text() div 1000 div 60 div 60" />
					<xsl:variable name="minutes" select="following-sibling::*/text() div 1000 div 60" />
					<xsl:variable name="seconds" select="format-number(following-sibling::*/text() div 1000 mod 60, '#')" />

					<xsl:value-of select="format-number(floor($hours), '00')" />:<xsl:value-of select="format-number(floor($minutes), '00')" />:<xsl:value-of select="format-number(floor($seconds), '00')" />
				</xsl:when>
				<xsl:otherwise>
					<xsl:value-of select="following-sibling::*/text()" />
				</xsl:otherwise>
			</xsl:choose>
		</td>
	</xsl:template>
</xsl:stylesheet>
