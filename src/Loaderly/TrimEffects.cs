namespace Loaderly;

internal enum TrimBlurShape
{
    Box,
    Soft,
    Pixelate
}

internal sealed record TrimBlurKeyframe(TimeSpan Time, double X, double Y, double Width, double Height)
{
    public TrimBlurKeyframe Clamp()
    {
        var width = Math.Clamp(Width, 0.03, 1.0);
        var height = Math.Clamp(Height, 0.03, 1.0);
        var x = Math.Clamp(X, 0, 1 - width);
        var y = Math.Clamp(Y, 0, 1 - height);
        return this with { X = x, Y = y, Width = width, Height = height };
    }
}

internal sealed record TrimBlurRegion(
    TimeSpan Start,
    TimeSpan End,
    TrimBlurShape Shape,
    int Strength,
    IReadOnlyList<TrimBlurKeyframe> Keyframes)
{
    public TimeSpan Duration => End - Start;

    public TrimBlurRegion Normalize()
    {
        var start = Start < TimeSpan.Zero ? TimeSpan.Zero : Start;
        var end = End <= start ? start + TimeSpan.FromMilliseconds(250) : End;
        var strength = Math.Clamp(Strength, 1, 40);
        var keyframes = Keyframes
            .Select(keyframe => keyframe with
            {
                Time = keyframe.Time < start ? start : keyframe.Time > end ? end : keyframe.Time
            })
            .Select(keyframe => keyframe.Clamp())
            .OrderBy(keyframe => keyframe.Time)
            .ToList();

        if (keyframes.Count == 0)
        {
            keyframes.Add(new TrimBlurKeyframe(start, 0.35, 0.35, 0.3, 0.22));
        }

        if (keyframes[0].Time > start)
        {
            keyframes.Insert(0, keyframes[0] with { Time = start });
        }

        if (keyframes[^1].Time < end)
        {
            keyframes.Add(keyframes[^1] with { Time = end });
        }

        return this with { Start = start, End = end, Strength = strength, Keyframes = keyframes };
    }

    public TrimBlurKeyframe FrameAt(TimeSpan time)
    {
        var normalized = Normalize();
        var keyframes = normalized.Keyframes;
        if (time <= keyframes[0].Time)
        {
            return keyframes[0].Clamp() with { Time = time };
        }

        for (var index = 0; index < keyframes.Count - 1; index++)
        {
            var left = keyframes[index];
            var right = keyframes[index + 1];
            if (time > right.Time)
            {
                continue;
            }

            var span = right.Time - left.Time;
            var progress = span <= TimeSpan.Zero
                ? 0
                : (time - left.Time).TotalSeconds / span.TotalSeconds;
            return new TrimBlurKeyframe(
                time,
                Lerp(left.X, right.X, progress),
                Lerp(left.Y, right.Y, progress),
                Lerp(left.Width, right.Width, progress),
                Lerp(left.Height, right.Height, progress)).Clamp();
        }

        return keyframes[^1].Clamp() with { Time = time };
    }

    public static IReadOnlyList<TrimBlurRegion> NormalizeMany(IEnumerable<TrimBlurRegion>? regions)
    {
        return (regions ?? [])
            .Select(region => region.Normalize())
            .Where(region => region.End > region.Start)
            .ToList();
    }

    public static IReadOnlyList<TrimBlurRegion> RetimeForComposition(
        IEnumerable<TrimBlurRegion>? regions,
        TrimComposition composition)
    {
        var sourceRegions = NormalizeMany(regions);
        if (sourceRegions.Count == 0 || composition.Segments.Count == 0)
        {
            return [];
        }

        var retimed = new List<TrimBlurRegion>();
        var outputOffset = TimeSpan.Zero;
        for (var segmentIndex = 0; segmentIndex < composition.Segments.Count; segmentIndex++)
        {
            var segment = composition.Segments[segmentIndex];
            foreach (var region in sourceRegions)
            {
                var overlapStart = Max(region.Start, segment.Start);
                var overlapEnd = Min(region.End, segment.End);
                if (overlapEnd <= overlapStart)
                {
                    continue;
                }

                var outputStart = outputOffset + (overlapStart - segment.Start);
                var outputEnd = outputOffset + (overlapEnd - segment.Start);
                var keyframes = new List<TrimBlurKeyframe>
                {
                    ToOutputKeyframe(region.FrameAt(overlapStart), outputStart)
                };
                keyframes.AddRange(region.Keyframes
                    .Where(keyframe => keyframe.Time > overlapStart && keyframe.Time < overlapEnd)
                    .Select(keyframe => ToOutputKeyframe(keyframe, outputOffset + (keyframe.Time - segment.Start))));
                keyframes.Add(ToOutputKeyframe(region.FrameAt(overlapEnd), outputEnd));

                retimed.Add(new TrimBlurRegion(outputStart, outputEnd, region.Shape, region.Strength, keyframes).Normalize());
            }

            var transition = segmentIndex < composition.Transitions.Count
                ? TrimComposition.EffectiveTransitionDuration(
                    segment,
                    composition.Segments[Math.Min(segmentIndex + 1, composition.Segments.Count - 1)],
                    composition.Transitions[segmentIndex])
                : TimeSpan.Zero;
            outputOffset += segment.Duration - transition;
        }

        return retimed;
    }

    private static TrimBlurKeyframe ToOutputKeyframe(TrimBlurKeyframe keyframe, TimeSpan outputTime)
    {
        return keyframe with { Time = outputTime };
    }

    private static double Lerp(double left, double right, double progress)
    {
        return left + (right - left) * Math.Clamp(progress, 0, 1);
    }

    private static TimeSpan Min(TimeSpan left, TimeSpan right)
    {
        return left <= right ? left : right;
    }

    private static TimeSpan Max(TimeSpan left, TimeSpan right)
    {
        return left >= right ? left : right;
    }
}

internal sealed record TrimZoomRegion(
    TimeSpan Start,
    TimeSpan End,
    double Scale,
    IReadOnlyList<TrimBlurKeyframe> Keyframes)
{
    public TimeSpan Duration => End - Start;

    public TrimZoomRegion Normalize()
    {
        var start = Start < TimeSpan.Zero ? TimeSpan.Zero : Start;
        var end = End <= start ? start + TimeSpan.FromMilliseconds(250) : End;
        var scale = Math.Clamp(double.IsNaN(Scale) || double.IsInfinity(Scale) ? 2.0 : Scale, 1.1, 4.0);
        var keyframes = Keyframes
            .Select(keyframe => keyframe with
            {
                Time = keyframe.Time < start ? start : keyframe.Time > end ? end : keyframe.Time
            })
            .Select(keyframe => keyframe.Clamp())
            .OrderBy(keyframe => keyframe.Time)
            .ToList();

        if (keyframes.Count == 0)
        {
            keyframes.Add(new TrimBlurKeyframe(start, 0.36, 0.28, 0.28, 0.22));
        }

        if (keyframes[0].Time > start)
        {
            keyframes.Insert(0, keyframes[0] with { Time = start });
        }

        if (keyframes[^1].Time < end)
        {
            keyframes.Add(keyframes[^1] with { Time = end });
        }

        return this with { Start = start, End = end, Scale = scale, Keyframes = keyframes };
    }

    public TrimBlurKeyframe FrameAt(TimeSpan time)
    {
        var normalized = Normalize();
        var keyframes = normalized.Keyframes;
        if (time <= keyframes[0].Time)
        {
            return keyframes[0].Clamp() with { Time = time };
        }

        for (var index = 0; index < keyframes.Count - 1; index++)
        {
            var left = keyframes[index];
            var right = keyframes[index + 1];
            if (time > right.Time)
            {
                continue;
            }

            var span = right.Time - left.Time;
            var progress = span <= TimeSpan.Zero
                ? 0
                : (time - left.Time).TotalSeconds / span.TotalSeconds;
            return new TrimBlurKeyframe(
                time,
                Lerp(left.X, right.X, progress),
                Lerp(left.Y, right.Y, progress),
                Lerp(left.Width, right.Width, progress),
                Lerp(left.Height, right.Height, progress)).Clamp();
        }

        return keyframes[^1].Clamp() with { Time = time };
    }

    public static IReadOnlyList<TrimZoomRegion> NormalizeMany(IEnumerable<TrimZoomRegion>? regions)
    {
        return (regions ?? [])
            .Select(region => region.Normalize())
            .Where(region => region.End > region.Start)
            .ToList();
    }

    public static IReadOnlyList<TrimZoomRegion> RetimeForComposition(
        IEnumerable<TrimZoomRegion>? regions,
        TrimComposition composition)
    {
        var sourceRegions = NormalizeMany(regions);
        if (sourceRegions.Count == 0 || composition.Segments.Count == 0)
        {
            return [];
        }

        var retimed = new List<TrimZoomRegion>();
        var outputOffset = TimeSpan.Zero;
        for (var segmentIndex = 0; segmentIndex < composition.Segments.Count; segmentIndex++)
        {
            var segment = composition.Segments[segmentIndex];
            foreach (var region in sourceRegions)
            {
                var overlapStart = Max(region.Start, segment.Start);
                var overlapEnd = Min(region.End, segment.End);
                if (overlapEnd <= overlapStart)
                {
                    continue;
                }

                var outputStart = outputOffset + (overlapStart - segment.Start);
                var outputEnd = outputOffset + (overlapEnd - segment.Start);
                var keyframes = new List<TrimBlurKeyframe>
                {
                    ToOutputKeyframe(region.FrameAt(overlapStart), outputStart)
                };
                keyframes.AddRange(region.Keyframes
                    .Where(keyframe => keyframe.Time > overlapStart && keyframe.Time < overlapEnd)
                    .Select(keyframe => ToOutputKeyframe(keyframe, outputOffset + (keyframe.Time - segment.Start))));
                keyframes.Add(ToOutputKeyframe(region.FrameAt(overlapEnd), outputEnd));

                retimed.Add(new TrimZoomRegion(outputStart, outputEnd, region.Scale, keyframes).Normalize());
            }

            var transition = segmentIndex < composition.Transitions.Count
                ? TrimComposition.EffectiveTransitionDuration(
                    segment,
                    composition.Segments[Math.Min(segmentIndex + 1, composition.Segments.Count - 1)],
                    composition.Transitions[segmentIndex])
                : TimeSpan.Zero;
            outputOffset += segment.Duration - transition;
        }

        return retimed;
    }

    private static TrimBlurKeyframe ToOutputKeyframe(TrimBlurKeyframe keyframe, TimeSpan outputTime)
    {
        return keyframe with { Time = outputTime };
    }

    private static double Lerp(double left, double right, double progress)
    {
        return left + (right - left) * Math.Clamp(progress, 0, 1);
    }

    private static TimeSpan Min(TimeSpan left, TimeSpan right)
    {
        return left <= right ? left : right;
    }

    private static TimeSpan Max(TimeSpan left, TimeSpan right)
    {
        return left >= right ? left : right;
    }
}
